import { Injectable } from '@nestjs/common';
import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, validateSync } from 'class-validator';

enum NodeEnv {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

@Injectable()
export class EnvValues {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsInt()
  @Transform(({ value }) => Number(value))
  PORT: number;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRATION: string;

  @IsString()
  REDIS_HOST: string;

  @IsInt()
  @Transform(({ value }) => Number(value))
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  MAIL_HOST: string;

  @IsInt()
  @Transform(({ value }) => Number(value))
  MAIL_PORT: number;

  @IsString()
  MAIL_USER: string;

  @IsString()
  MAIL_PASSWORD: string;

  @IsString()
  FX_RATE_API_URL: string;

  @IsString()
  FX_RATE_API_KEY: string;

  @IsInt()
  @Transform(({ value }) => Number(value))
  FX_RATE_CACHE_TTL: number;

  @IsInt()
  @Transform(({ value }) => Number(value))
  INITIAL_NGN_BALANCE: number;
}

export const validateEnv = (config: Record<string, unknown>) => {
  const env = plainToInstance(EnvValues, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(env, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((e) => JSON.stringify(e.constraints))
        .join('\n')}`,
    );
  }

  return env;
};
