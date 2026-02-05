import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionRepository } from './transaction.repository';
import { Transaction } from './entities/transaction.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { Currency } from '../../common/enums/currency.enum';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { GetTransactionsDto } from './dto/get-transactions.dto';

interface CreateTransactionData {
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  fromCurrency: Currency;
  toCurrency: Currency | null;
  amount: string;
  convertedAmount: string | null;
  exchangeRate: string | null;
  description: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TransactionService {
  constructor(private transactionRepository: TransactionRepository) {}

  async createTransaction(
    entityManager: EntityManager,
    data: CreateTransactionData,
  ): Promise<Transaction> {
    const transaction = entityManager.create(Transaction, data);
    return entityManager.save(transaction);
  }

  async getTransactions(
    userId: string,
    query: GetTransactionsDto,
  ): Promise<PaginatedResponse<Transaction>> {
    const { type, status, page = 1, limit = 20 } = query;

    const [transactions, total] = await this.transactionRepository.findByUserId(userId, {
      type,
      status,
      page,
      limit,
    });

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null> {
    return this.transactionRepository.findByIdempotencyKey(idempotencyKey);
  }
}
