import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios, { AxiosInstance } from 'axios';
import { Currency } from '../../common/enums/currency.enum';
import { ExchangeRateResponse } from './interfaces/exchange-rate-response.interface';

@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly cacheTtl: number;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiUrl = this.configService.get<string>('FX_RATE_API_URL', '');
    this.apiKey = this.configService.get<string>('FX_RATE_API_KEY', '');
    this.cacheTtl = this.configService.get<number>('FX_RATE_CACHE_TTL', 300);

    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getExchangeRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) {
      return 1;
    }

    const cacheKey = `fx_rate:${from}:${to}`;
    const cachedRate = await this.cacheManager.get<number>(cacheKey);

    if (cachedRate) {
      this.logger.log(`Using cached rate for ${from} to ${to}: ${cachedRate}`);
      return cachedRate;
    }

    try {
      const rates = await this.fetchRatesFromApi(from);
      const rate = rates[to];

      if (!rate) {
        throw new BadRequestException(`Exchange rate not available for ${from} to ${to}`);
      }

      await this.cacheManager.set(cacheKey, rate, this.cacheTtl);
      this.logger.log(`Fetched and cached rate for ${from} to ${to}: ${rate}`);

      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate for ${from} to ${to}`, error);
      throw new BadRequestException('Unable to fetch exchange rates. Please try again later.');
    }
  }

  async getAllRates(baseCurrency: Currency): Promise<Record<string, number>> {
    const cacheKey = `fx_rates:${baseCurrency}`;
    const cachedRates = await this.cacheManager.get<Record<string, number>>(cacheKey);

    if (cachedRates) {
      this.logger.log(`Using cached rates for ${baseCurrency}`);
      return cachedRates;
    }

    try {
      const rates = await this.fetchRatesFromApi(baseCurrency);
      await this.cacheManager.set(cacheKey, rates, this.cacheTtl);
      this.logger.log(`Fetched and cached all rates for ${baseCurrency}`);

      return rates;
    } catch (error) {
      this.logger.error(`Failed to fetch all rates for ${baseCurrency}`, error);
      throw new BadRequestException('Unable to fetch exchange rates. Please try again later.');
    }
  }

  private async fetchRatesFromApi(baseCurrency: Currency): Promise<Record<string, number>> {
    const url = `${this.apiUrl}/${this.apiKey}/latest/${baseCurrency}`;

    try {
      const response = await this.axiosInstance.get<ExchangeRateResponse>(url);

      if (response.data.result !== 'success') {
        throw new Error('API returned non-success result');
      }

      return response.data.conversion_rates;
    } catch (error) {
      this.logger.error(`API request failed for ${baseCurrency}`, error);
      throw error;
    }
  }

  async convertAmount(from: Currency, to: Currency, amount: number): Promise<number> {
    const rate = await this.getExchangeRate(from, to);
    return amount * rate;
  }
}
