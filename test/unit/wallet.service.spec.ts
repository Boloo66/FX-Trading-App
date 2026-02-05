import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { WalletService } from '../../src/modules/wallet/wallet.service';
import { WalletRepository } from '../../src/modules/wallet/wallet.repository';
import { TransactionService } from '../../src/modules/transaction/transaction.service';
import { FxRateService } from '../../src/modules/fx-rate/fx-rate.service';
import { Currency } from '../../src/common/enums/currency.enum';
import { WalletBalance } from '../../src/modules/wallet/entities/wallet-balance.entity';
import { TransactionType } from '../../src/common/enums/transaction-type.enum';

describe('WalletService', () => {
  /* eslint-disable */
  let service: WalletService;
  let walletRepository: WalletRepository;
  let transactionService: TransactionService;
  let fxRateService: FxRateService;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  /* eslint-enable */

  const mockWalletRepository = {
    findByUserIdAndCurrency: jest.fn(),
    createOrUpdate: jest.fn(),
    findAllByUserId: jest.fn(),
  };

  const mockTransactionService = {
    createTransaction: jest.fn(),
    findByIdempotencyKey: jest.fn(),
  };

  const mockFxRateService = {
    getExchangeRate: jest.fn(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: mockEntityManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: unknown) => {
      const config: Record<string, unknown> = {
        INITIAL_NGN_BALANCE: 0,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WalletRepository,
          useValue: mockWalletRepository,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: FxRateService,
          useValue: mockFxRateService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get<WalletRepository>(WalletRepository);
    transactionService = module.get<TransactionService>(TransactionService);
    fxRateService = module.get<FxRateService>(FxRateService);
    dataSource = module.get<DataSource>(DataSource);
    queryRunner = mockQueryRunner as unknown as QueryRunner;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeWallet', () => {
    it('should initialize wallet with NGN balance of 0', async () => {
      mockWalletRepository.createOrUpdate.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-123',
        currency: Currency.NGN,
        balance: '0',
      });

      await service.initializeWallet('user-123');

      expect(mockWalletRepository.createOrUpdate).toHaveBeenCalledWith(
        'user-123',
        Currency.NGN,
        '0',
      );
    });
  });

  describe('getWalletBalances', () => {
    it('should return all wallet balances with formatted amounts', async () => {
      const mockWallets = [
        {
          id: '1',
          userId: 'user-123',
          currency: Currency.NGN,
          balance: '5000000',
          getBalance: jest.fn().mockReturnValue(BigInt(5000000)),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: 'user-123',
          currency: Currency.USD,
          balance: '10000',
          getBalance: jest.fn().mockReturnValue(BigInt(10000)),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockWalletRepository.findAllByUserId.mockResolvedValue(mockWallets);

      const result = await service.getWalletBalances('user-123');

      expect(result).toEqual([
        {
          currency: Currency.NGN,
          balance: 50000,
          balanceFormatted: '₦50,000.00',
        },
        {
          currency: Currency.USD,
          balance: 100,
          balanceFormatted: '$100.00',
        },
      ]);
    });
  });

  describe('fundWallet', () => {
    it('should fund wallet successfully with new balance', async () => {
      const fundDto = {
        currency: Currency.NGN,
        amount: 10000,
        description: 'Test funding',
      };

      const mockWallet = {
        id: '1',
        userId: 'user-123',
        currency: Currency.NGN,
        balance: '500000',
        getBalance: jest.fn().mockReturnValue(BigInt(500000)),
        setBalance: jest.fn(),
      };

      mockEntityManager.findOne.mockResolvedValue(mockWallet);
      mockEntityManager.save.mockResolvedValue(mockWallet);
      mockTransactionService.createTransaction.mockResolvedValue({
        id: 'txn-1',
        type: TransactionType.FUNDING,
      });

      const result = await service.fundWallet('user-123', fundDto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockWallet.setBalance).toHaveBeenCalledWith(BigInt(1500000));
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.newBalance).toBe(15000);
      expect(result.newBalanceFormatted).toBe('₦15,000.00');
    });

    it('should throw error for negative amount', async () => {
      const fundDto = {
        currency: Currency.NGN,
        amount: -100,
        description: 'Invalid',
      };

      await expect(service.fundWallet('user-123', fundDto)).rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on error', async () => {
      const fundDto = {
        currency: Currency.NGN,
        amount: 10000,
        description: 'Test',
      };

      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.fundWallet('user-123', fundDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create new wallet if none exists', async () => {
      const fundDto = {
        currency: Currency.USD,
        amount: 100,
      };

      mockEntityManager.findOne.mockResolvedValue(null);

      const mockNewWallet = {
        userId: 'user-123',
        currency: Currency.USD,
        balance: '0',
        getBalance: jest.fn().mockReturnValue(BigInt(0)),
        setBalance: jest.fn(),
      };

      mockEntityManager.create.mockReturnValue(mockNewWallet);
      mockEntityManager.save.mockResolvedValue(mockNewWallet);
      mockTransactionService.createTransaction.mockResolvedValue({
        id: 'txn-1',
      });

      const result = await service.fundWallet('user-123', fundDto);

      expect(mockEntityManager.create).toHaveBeenCalledWith(WalletBalance, {
        userId: 'user-123',
        currency: Currency.USD,
        balance: '0',
      });
      expect(result.newBalance).toBe(100);
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency successfully', async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 10000,
      };

      const mockFromWallet = {
        id: '1',
        userId: 'user-123',
        currency: Currency.NGN,
        balance: '5000000',
        getBalance: jest.fn().mockReturnValue(BigInt(5000000)),
        setBalance: jest.fn(),
      };

      const mockToWallet = {
        id: '2',
        userId: 'user-123',
        currency: Currency.USD,
        balance: '10000',
        getBalance: jest.fn().mockReturnValue(BigInt(10000)),
        setBalance: jest.fn(),
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue(null);
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockFromWallet)
        .mockResolvedValueOnce(mockToWallet);
      mockFxRateService.getExchangeRate.mockResolvedValue(0.000625);
      mockEntityManager.save.mockResolvedValue({});
      mockTransactionService.createTransaction.mockResolvedValue({
        id: 'txn-1',
        type: TransactionType.CONVERSION,
      });

      const result = await service.convertCurrency('user-123', convertDto);

      expect(mockFromWallet.setBalance).toHaveBeenCalledWith(BigInt(4000000));
      expect(mockToWallet.setBalance).toHaveBeenCalledWith(BigInt(10625));
      expect(result.fromBalance).toBe(40000);
      expect(result.toBalance).toBe(106.25);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw error for insufficient balance', async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 100000,
      };

      const mockFromWallet = {
        id: '1',
        userId: 'user-123',
        currency: Currency.NGN,
        balance: '500000',
        getBalance: jest.fn().mockReturnValue(BigInt(500000)),
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue(null);
      mockEntityManager.findOne.mockResolvedValue(mockFromWallet);

      await expect(service.convertCurrency('user-123', convertDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error for same currency conversion', async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.NGN,
        amount: 10000,
      };

      await expect(service.convertCurrency('user-123', convertDto)).rejects.toThrow(
        'Cannot convert to the same currency',
      );
    });

    it('should detect duplicate transaction with idempotency key', async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 10000,
        idempotencyKey: 'unique-key-123',
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue({
        id: 'existing-txn',
      });

      await expect(service.convertCurrency('user-123', convertDto)).rejects.toThrow(
        'Duplicate transaction detected',
      );
    });

    it('should create target wallet if it does not exist', async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 10000,
      };

      const mockFromWallet = {
        id: '1',
        userId: 'user-123',
        currency: Currency.NGN,
        balance: '5000000',
        getBalance: jest.fn().mockReturnValue(BigInt(5000000)),
        setBalance: jest.fn(),
      };

      const mockNewToWallet = {
        userId: 'user-123',
        currency: Currency.USD,
        balance: '0',
        getBalance: jest.fn().mockReturnValue(BigInt(0)),
        setBalance: jest.fn(),
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue(null);
      mockEntityManager.findOne.mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(null);
      mockEntityManager.create.mockReturnValue(mockNewToWallet);
      mockFxRateService.getExchangeRate.mockResolvedValue(0.000625);
      mockEntityManager.save.mockResolvedValue({});
      mockTransactionService.createTransaction.mockResolvedValue({
        id: 'txn-1',
      });

      await service.convertCurrency('user-123', convertDto);

      expect(mockEntityManager.create).toHaveBeenCalledWith(WalletBalance, {
        userId: 'user-123',
        currency: Currency.USD,
        balance: '0',
      });
    });
  });

  describe('tradeCurrency', () => {
    it('should trade currency successfully', async () => {
      const tradeDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.NGN,
        amount: 100,
      };

      const mockFromWallet = {
        id: '1',
        userId: 'user-123',
        currency: Currency.USD,
        balance: '20000',
        getBalance: jest.fn().mockReturnValue(BigInt(20000)),
        setBalance: jest.fn(),
      };

      const mockToWallet = {
        id: '2',
        userId: 'user-123',
        currency: Currency.NGN,
        balance: '5000000',
        getBalance: jest.fn().mockReturnValue(BigInt(5000000)),
        setBalance: jest.fn(),
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue(null);
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockFromWallet)
        .mockResolvedValueOnce(mockToWallet);
      mockFxRateService.getExchangeRate.mockResolvedValue(1600);
      mockEntityManager.save.mockResolvedValue({});
      mockTransactionService.createTransaction.mockResolvedValue({
        id: 'txn-1',
        type: TransactionType.TRADE,
      });

      const result = await service.tradeCurrency('user-123', tradeDto);

      expect(mockFromWallet.setBalance).toHaveBeenCalledWith(BigInt(10000));
      expect(mockToWallet.setBalance).toHaveBeenCalledWith(BigInt(21000000));
      expect(result.fromBalance).toBe(100);
      expect(result.toBalance).toBe(210000);
      expect(result.fromBalanceFormatted).toBe('$100.00');
      expect(result.toBalanceFormatted).toBe('₦210,000.00');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw error for same currency trade', async () => {
      const tradeDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.NGN,
        amount: 10000,
      };

      await expect(service.tradeCurrency('user-123', tradeDto)).rejects.toThrow(
        'Cannot trade the same currency',
      );
    });

    it('should throw error if source wallet not found', async () => {
      const tradeDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.NGN,
        amount: 100,
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue(null);
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(service.tradeCurrency('user-123', tradeDto)).rejects.toThrow(
        'Source wallet not found',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should handle FX rate service errors gracefully', async () => {
      const tradeDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.NGN,
        amount: 100,
      };

      const mockFromWallet = {
        id: '1',
        userId: 'user-123',
        currency: Currency.USD,
        balance: '20000',
        getBalance: jest.fn().mockReturnValue(BigInt(20000)),
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue(null);
      mockEntityManager.findOne.mockResolvedValue(mockFromWallet);
      mockFxRateService.getExchangeRate.mockRejectedValue(new Error('FX API unavailable'));

      await expect(service.tradeCurrency('user-123', tradeDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle very small amounts correctly', async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 0.01,
      };

      const mockFromWallet = {
        id: '1',
        userId: 'user-123',
        currency: Currency.NGN,
        balance: '1000',
        getBalance: jest.fn().mockReturnValue(BigInt(1000)),
        setBalance: jest.fn(),
      };

      const mockToWallet = {
        id: '2',
        userId: 'user-123',
        currency: Currency.USD,
        balance: '0',
        getBalance: jest.fn().mockReturnValue(BigInt(0)),
        setBalance: jest.fn(),
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue(null);
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockFromWallet)
        .mockResolvedValueOnce(mockToWallet);
      mockFxRateService.getExchangeRate.mockResolvedValue(0.000625);
      mockEntityManager.save.mockResolvedValue({});
      mockTransactionService.createTransaction.mockResolvedValue({ id: 'txn-1' });

      const result = await service.convertCurrency('user-123', convertDto);

      expect(result.fromBalance).toBeCloseTo(9.99, 2);
      expect(result.toBalance).toBeCloseTo(0.01, 4);
    });

    it('should handle large amounts correctly', async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 10000000,
      };

      const mockFromWallet = {
        id: '1',
        userId: 'user-123',
        currency: Currency.NGN,
        balance: '1000000000',
        getBalance: jest.fn().mockReturnValue(BigInt(1000000000)),
        setBalance: jest.fn(),
      };

      const mockToWallet = {
        id: '2',
        userId: 'user-123',
        currency: Currency.USD,
        balance: '0',
        getBalance: jest.fn().mockReturnValue(BigInt(0)),
        setBalance: jest.fn(),
      };

      mockTransactionService.findByIdempotencyKey.mockResolvedValue(null);
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockFromWallet)
        .mockResolvedValueOnce(mockToWallet);
      mockFxRateService.getExchangeRate.mockResolvedValue(0.000625);
      mockEntityManager.save.mockResolvedValue({});
      mockTransactionService.createTransaction.mockResolvedValue({ id: 'txn-1' });

      await service.convertCurrency('user-123', convertDto);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
