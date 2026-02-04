import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { FxRateModule } from './modules/fx-rate/fx-rate.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    WalletModule,
    TransactionModule,
    FxRateModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
