import { IsEnum, IsNumber, Min, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../../../common/enums/currency.enum';
import { Type } from 'class-transformer';

export class ConvertCurrencyDto {
  @ApiProperty({ enum: Currency, example: Currency.NGN })
  @IsEnum(Currency, { message: 'Invalid from currency' })
  fromCurrency: Currency;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency, { message: 'Invalid to currency' })
  toCurrency: Currency;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @Min(1, { message: 'Amount must be greater than 0' }) // I use 1 as base i.e 1$ = 1450 naira or 1 naira = 0.00069$
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
