import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { Otp } from '../../auth/entities/otp.entity';
import { WalletBalance } from '../../wallet/entities/wallet-balance.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['email', 'role'])
@Index(['email', 'isVerified'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => WalletBalance, (walletBalance) => walletBalance.user)
  walletBalances: WalletBalance[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Otp, (otp) => otp.user)
  otps: Otp[];
}
