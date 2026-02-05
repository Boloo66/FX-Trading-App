import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException } from '@nestjs/common';
import { FxRateService } from '../../src/modules/fx-rate/fx-rate.service';
import { Currency } from '../../src/common/enums/currency.enum';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FxRateService', () => {
  let service: FxRateService;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: unknown) => {
      const config: Record<string, unknown> = {
        FX_RATE_API_URL: 'https://api.test.com',
        FX_RATE_API_KEY: 'test-key',
        FX_RATE_CACHE_TTL: 300,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxRateService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<FxRateService>(FxRateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getExchangeRate', () => {
    it('should return 1 for same currency', async () => {
      const rate = await service.getExchangeRate(Currency.NGN, Currency.NGN);
      expect(rate).toBe(1);
    });

    it('should return cached rate if available', async () => {
      const cachedRate = 0.000625;
      cacheManager.get.mockResolvedValue(cachedRate);

      const rate = await service.getExchangeRate(Currency.NGN, Currency.USD);

      expect(rate).toBe(cachedRate);
      expect(cacheManager.get).toHaveBeenCalledWith('fx_rate:NGN:USD');
      expect(mockedAxios.create).not.toHaveBeenCalled();
    });

    it('should fetch and cache rate if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);

      const mockResponse = {
        data: {
          result: 'success',
          conversion_rates: {
            USD: 0.000625,
            EUR: 0.00058,
            GBP: 0.0005,
          },
        },
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
      } as never);

      const rate = await service.getExchangeRate(Currency.NGN, Currency.USD);

      expect(rate).toBe(0.000625);
      expect(cacheManager.set).toHaveBeenCalledWith('fx_rate:NGN:USD', 0.000625, 300);
    });

    it('should throw error if rate not available', async () => {
      cacheManager.get.mockResolvedValue(null);

      const mockResponse = {
        data: {
          result: 'success',
          conversion_rates: {
            EUR: 0.00058,
          },
        },
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
      } as never);

      await expect(service.getExchangeRate(Currency.NGN, Currency.USD)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error on API failure', async () => {
      cacheManager.get.mockResolvedValue(null);

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('API Error')),
      } as never);

      await expect(service.getExchangeRate(Currency.NGN, Currency.USD)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAllRates', () => {
    it('should return cached rates if available', async () => {
      const cachedRates = {
        USD: 0.000625,
        EUR: 0.00058,
        GBP: 0.0005,
      };

      cacheManager.get.mockResolvedValue(cachedRates);

      const rates = await service.getAllRates(Currency.NGN);

      expect(rates).toEqual(cachedRates);
      expect(cacheManager.get).toHaveBeenCalledWith('fx_rates:NGN');
    });

    it('should fetch and cache all rates if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);

      const mockResponse = {
        data: {
          result: 'success',
          conversion_rates: {
            USD: 0.000625,
            EUR: 0.00058,
            GBP: 0.0005,
          },
        },
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
      } as never);

      const rates = await service.getAllRates(Currency.NGN);

      expect(rates).toEqual(mockResponse.data.conversion_rates);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'fx_rates:NGN',
        mockResponse.data.conversion_rates,
        300,
      );
    });
  });

  describe('convertAmount', () => {
    it('should convert amount correctly', async () => {
      cacheManager.get.mockResolvedValue(0.000625);

      const result = await service.convertAmount(Currency.NGN, Currency.USD, 10000);

      expect(result).toBe(6.25);
    });
  });
});
