import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { WalletRepository } from './wallet.repository';
import { TransactionService } from '../transaction/transaction.service';
import { FxRateService } from '../fx-rate/fx-rate.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { TradeCurrencyDto } from './dto/trade-currency.dto';
import { Currency } from '../../common/enums/currency.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { WalletBalance } from './entities/wallet-balance.entity';
import { Money } from '../../common/utils/money.util';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private walletRepository: WalletRepository,
    private transactionService: TransactionService,
    private fxRateService: FxRateService,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async initializeWallet(userId: string): Promise<void> {
    const initialBalance = this.configService.get<number>('INITIAL_NGN_BALANCE', 0);

    await this.walletRepository.createOrUpdate(userId, Currency.NGN, initialBalance.toString());

    this.logger.log(`Wallet initialized for user ${userId}`);
  }

  async getWalletBalances(userId: string): Promise<WalletBalance[]> {
    return this.walletRepository.findAllByUserId(userId);
  }

  async fundWallet(
    userId: string,
    fundWalletDto: FundWalletDto,
  ): Promise<{ transaction: object; newBalance: number; newBalanceFormatted: string }> {
    const { currency, amount, description } = fundWalletDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const amountInSmallestUnit = Money.toSmallestUnit(amount, currency);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let walletBalance = await queryRunner.manager.findOne(WalletBalance, {
        where: { userId, currency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!walletBalance) {
        walletBalance = queryRunner.manager.create(WalletBalance, {
          userId,
          currency,
          balance: '0',
        });
      }

      const currentBalance = walletBalance.getBalance();
      const newBalance = Money.add(currentBalance, amountInSmallestUnit);
      walletBalance.setBalance(newBalance);

      await queryRunner.manager.save(walletBalance);

      const transaction = await this.transactionService.createTransaction(queryRunner.manager, {
        userId,
        type: TransactionType.FUNDING,
        status: TransactionStatus.COMPLETED,
        fromCurrency: currency,
        toCurrency: null,
        amount: amountInSmallestUnit.toString(),
        convertedAmount: null,
        exchangeRate: null,
        description: description || `Wallet funding in ${currency}`,
        idempotencyKey: uuidv4(),
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Wallet funded: User ${userId}, ${Money.format(amountInSmallestUnit, currency)}`,
      );

      return {
        transaction,
        newBalance: Money.fromSmallestUnit(newBalance, currency),
        newBalanceFormatted: Money.format(newBalance, currency),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to fund wallet for user ${userId}`, error);
      throw new InternalServerErrorException('Failed to fund wallet');
    } finally {
      await queryRunner.release();
    }
  }

  async convertCurrency(
    userId: string,
    convertDto: ConvertCurrencyDto,
  ): Promise<{
    transaction: object;
    fromBalance: number;
    toBalance: number;
    fromBalanceFormatted: string;
    toBalanceFormatted: string;
  }> {
    const { fromCurrency, toCurrency, amount, idempotencyKey } = convertDto;

    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Cannot convert to the same currency');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const amountInSmallestUnit = Money.toSmallestUnit(amount, fromCurrency);

    const existingTransaction = idempotencyKey
      ? await this.transactionService.findByIdempotencyKey(idempotencyKey)
      : null;

    if (existingTransaction) {
      throw new BadRequestException('Duplicate transaction detected');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromWallet = await queryRunner.manager.findOne(WalletBalance, {
        where: { userId, currency: fromCurrency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromWallet) {
        throw new BadRequestException('Source wallet not found');
      }

      const fromBalanceBigInt = fromWallet.getBalance();

      if (Money.isLessThan(fromBalanceBigInt, amountInSmallestUnit)) {
        throw new BadRequestException('Insufficient balance');
      }

      const exchangeRate = await this.fxRateService.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmountInSmallestUnit = Money.multiplyByRate(
        amountInSmallestUnit,
        exchangeRate,
      );

      const newFromBalance = Money.subtract(fromBalanceBigInt, amountInSmallestUnit);
      fromWallet.setBalance(newFromBalance);
      await queryRunner.manager.save(fromWallet);

      let toWallet = await queryRunner.manager.findOne(WalletBalance, {
        where: { userId, currency: toCurrency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!toWallet) {
        toWallet = queryRunner.manager.create(WalletBalance, {
          userId,
          currency: toCurrency,
          balance: '0',
        });
      }

      const toBalanceBigInt = toWallet.getBalance();
      const newToBalance = Money.add(toBalanceBigInt, convertedAmountInSmallestUnit);
      toWallet.setBalance(newToBalance);
      await queryRunner.manager.save(toWallet);

      const transaction = await this.transactionService.createTransaction(queryRunner.manager, {
        userId,
        type: TransactionType.CONVERSION,
        status: TransactionStatus.COMPLETED,
        fromCurrency,
        toCurrency,
        amount: amountInSmallestUnit.toString(),
        convertedAmount: convertedAmountInSmallestUnit.toString(),
        exchangeRate: exchangeRate.toFixed(10),
        description: `Converted ${Money.format(amountInSmallestUnit, fromCurrency)} to ${Money.format(convertedAmountInSmallestUnit, toCurrency)}`,
        idempotencyKey: idempotencyKey || uuidv4(),
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Currency converted: User ${userId}, ${Money.format(amountInSmallestUnit, fromCurrency)} to ${Money.format(convertedAmountInSmallestUnit, toCurrency)}`,
      );

      return {
        transaction,
        fromBalance: Money.fromSmallestUnit(newFromBalance, fromCurrency),
        toBalance: Money.fromSmallestUnit(newToBalance, toCurrency),
        fromBalanceFormatted: Money.format(newFromBalance, fromCurrency),
        toBalanceFormatted: Money.format(newToBalance, toCurrency),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to convert currency for user ${userId}`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to convert currency');
    } finally {
      await queryRunner.release();
    }
  }

  async tradeCurrency(
    userId: string,
    tradeDto: TradeCurrencyDto,
  ): Promise<{
    transaction: object;
    fromBalance: number;
    toBalance: number;
    fromBalanceFormatted: string;
    toBalanceFormatted: string;
  }> {
    const { fromCurrency, toCurrency, amount, idempotencyKey } = tradeDto;

    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Cannot trade the same currency');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const amountInSmallestUnit = Money.toSmallestUnit(amount, fromCurrency);

    const existingTransaction = idempotencyKey
      ? await this.transactionService.findByIdempotencyKey(idempotencyKey)
      : null;

    if (existingTransaction) {
      throw new BadRequestException('Duplicate transaction detected');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromWallet = await queryRunner.manager.findOne(WalletBalance, {
        where: { userId, currency: fromCurrency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromWallet) {
        throw new BadRequestException('Source wallet not found');
      }

      const fromBalanceBigInt = fromWallet.getBalance();

      if (Money.isLessThan(fromBalanceBigInt, amountInSmallestUnit)) {
        throw new BadRequestException('Insufficient balance');
      }

      const exchangeRate = await this.fxRateService.getExchangeRate(fromCurrency, toCurrency);

      const convertedAmountInSmallestUnit = Money.multiplyByRate(
        amountInSmallestUnit,
        exchangeRate,
      );

      const newFromBalance = Money.subtract(fromBalanceBigInt, amountInSmallestUnit);
      fromWallet.setBalance(newFromBalance);
      await queryRunner.manager.save(fromWallet);

      let toWallet = await queryRunner.manager.findOne(WalletBalance, {
        where: { userId, currency: toCurrency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!toWallet) {
        toWallet = queryRunner.manager.create(WalletBalance, {
          userId,
          currency: toCurrency,
          balance: '0',
        });
      }

      const toBalanceBigInt = toWallet.getBalance();
      const newToBalance = Money.add(toBalanceBigInt, convertedAmountInSmallestUnit);
      toWallet.setBalance(newToBalance);
      await queryRunner.manager.save(toWallet);

      const transaction = await this.transactionService.createTransaction(queryRunner.manager, {
        userId,
        type: TransactionType.TRADE,
        status: TransactionStatus.COMPLETED,
        fromCurrency,
        toCurrency,
        amount: amountInSmallestUnit.toString(),
        convertedAmount: convertedAmountInSmallestUnit.toString(),
        exchangeRate: exchangeRate.toFixed(10),
        description: `Traded ${Money.format(amountInSmallestUnit, fromCurrency)} for ${Money.format(convertedAmountInSmallestUnit, toCurrency)}`,
        idempotencyKey: idempotencyKey || uuidv4(),
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Currency traded: User ${userId}, ${Money.format(amountInSmallestUnit, fromCurrency)} to ${Money.format(convertedAmountInSmallestUnit, toCurrency)}`,
      );

      return {
        transaction,
        fromBalance: Money.fromSmallestUnit(newFromBalance, fromCurrency),
        toBalance: Money.fromSmallestUnit(newToBalance, toCurrency),
        fromBalanceFormatted: Money.format(newFromBalance, fromCurrency),
        toBalanceFormatted: Money.format(newToBalance, toCurrency),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to trade currency for user ${userId}`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to trade currency');
    } finally {
      await queryRunner.release();
    }
  }
}
