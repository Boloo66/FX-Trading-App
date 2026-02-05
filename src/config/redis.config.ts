import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

export const redisConfig: CacheModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const store = await redisStore({
      socket: {
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
      },
      ttl: configService.get<number>('REDIS_TTL', 600),
      ...(configService.get('NODE_ENV') == 'production'
        ? { password: configService.get<string>('REDIS_PASSWORD', '') }
        : {}),
    });

    return {
      store: store as unknown as string,
    };
  },
};
