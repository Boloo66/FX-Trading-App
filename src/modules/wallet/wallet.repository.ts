import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WalletBalance } from './entities/wallet-balance.entity';
import { Currency } from '../../common/enums/currency.enum';

@Injectable()
export class WalletRepository extends Repository<WalletBalance> {
  constructor(private dataSource: DataSource) {
    super(WalletBalance, dataSource.createEntityManager());
  }

  async findByUserIdAndCurrency(userId: string, currency: Currency): Promise<WalletBalance | null> {
    return this.findOne({
      where: { userId, currency },
    });
  }

  async findAllByUserId(userId: string): Promise<WalletBalance[]> {
    return this.find({
      where: { userId },
      order: { currency: 'ASC' },
    });
  }

  async createOrUpdate(
    userId: string,
    currency: Currency,
    balance: string,
  ): Promise<WalletBalance> {
    let walletBalance = await this.findByUserIdAndCurrency(userId, currency);

    if (walletBalance) {
      walletBalance.balance = balance;
    } else {
      walletBalance = this.create({
        userId,
        currency,
        balance,
      });
    }

    return this.save(walletBalance);
  }
}
