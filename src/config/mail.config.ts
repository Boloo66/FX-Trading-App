import { ConfigService } from '@nestjs/config';

export const getMailConfig = (configService: ConfigService) => ({
  host: configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
  port: configService.get<number>('MAIL_PORT', 587),
  secure: false,
  auth: {
    user: configService.get<string>('MAIL_USER'),
    pass: configService.get<string>('MAIL_PASSWORD'),
  },
});
