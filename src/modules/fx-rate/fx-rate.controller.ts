import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FxRateService } from './fx-rate.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Currency } from '../../common/enums/currency.enum';

@ApiTags('FX Rates')
@Controller('fx/rates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FxRateController {
  constructor(private fxRateService: FxRateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all exchange rates for a base currency' })
  @ApiQuery({ name: 'base', enum: Currency, required: false })
  @ApiResponse({ status: 200, description: 'Exchange rates retrieved successfully' })
  async getRates(@Query('base') base: Currency = Currency.NGN) {
    return this.fxRateService.getAllRates(base);
  }

  @Get('convert')
  @ApiOperation({ summary: 'Get exchange rate for currency pair' })
  @ApiQuery({ name: 'from', enum: Currency })
  @ApiQuery({ name: 'to', enum: Currency })
  @ApiResponse({ status: 200, description: 'Exchange rate retrieved successfully' })
  async getExchangeRate(@Query('from') from: Currency, @Query('to') to: Currency) {
    const rate = await this.fxRateService.getExchangeRate(from, to);
    return { from, to, rate };
  }
}
