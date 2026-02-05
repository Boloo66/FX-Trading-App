import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { WalletBalance } from './entities/wallet-balance.entity';
import { TransactionModule } from '../transaction/transaction.module';
import { FxRateModule } from '../fx-rate/fx-rate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletBalance]),
    forwardRef(() => TransactionModule),
    FxRateModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}
