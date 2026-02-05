import { Injectable } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';

@Injectable()
export class TransactionRepository extends Repository<Transaction> {
  constructor(private dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  async findByUserId(
    userId: string,
    filters: {
      type?: TransactionType;
      status?: TransactionStatus;
      page: number;
      limit: number;
    },
  ): Promise<[Transaction[], number]> {
    const { type, status, page, limit } = filters;

    const where: FindOptionsWhere<Transaction> = { userId };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    return this.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null> {
    return this.findOne({ where: { idempotencyKey } });
  }
}
