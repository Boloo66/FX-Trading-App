import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '../modules/user/events/user-created-event';
import { MailService } from '../modules/mail/mail.service';
import { EmailEventPayload } from '../modules/user/events/email-verified.event';

@Injectable()
export class NotificationsService {
  constructor(private readonly mailService: MailService) {}
  @OnEvent('user.created', { async: true })
  async handleUserCreatedEventAsync(event: UserCreatedEvent) {
    await this.mailService.sendOtpEmail(event.email, event.otp);
  }

  @OnEvent('user.created', { async: true })
  async handleUserWelcomeEmail(event: EmailEventPayload) {
    await this.mailService.sendWelcomeEmail(event.email);
  }
}
