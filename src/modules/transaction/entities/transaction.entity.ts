import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { Currency } from '../../../common/enums/currency.enum';

@Entity('transactions')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['type'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'enum', enum: Currency })
  fromCurrency: Currency;

  @Column({ type: 'enum', enum: Currency, nullable: true })
  toCurrency: Currency | null;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'bigint', nullable: true })
  convertedAmount: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  exchangeRate: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ unique: true })
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  getAmount(): bigint {
    return BigInt(this.amount);
  }

  getConvertedAmount(): bigint | null {
    return this.convertedAmount ? BigInt(this.convertedAmount) : null;
  }

  getExchangeRate(): number | null {
    return this.exchangeRate ? parseFloat(this.exchangeRate) : null;
  }
}
