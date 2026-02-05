import { Module } from '@nestjs/common';
import { MailModule } from '../modules/mail/mail.module';
import { NotificationsService } from './notification.service';

@Module({
  imports: [MailModule],
  providers: [NotificationsService],
})
export class NotificationModule {}
