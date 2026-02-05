import { Money } from '../../src/common/utils/money.util';
import { Currency } from '../../src/common/enums/currency.enum';

describe('Money Utility', () => {
  describe('toSmallestUnit', () => {
    it('should convert NGN correctly (2 decimals)', () => {
      expect(Money.toSmallestUnit(10000.5, Currency.NGN)).toBe(BigInt(1000050));
      expect(Money.toSmallestUnit(0.01, Currency.NGN)).toBe(BigInt(1));
      expect(Money.toSmallestUnit(1, Currency.NGN)).toBe(BigInt(100));
    });

    it('should convert USD correctly (2 decimals)', () => {
      expect(Money.toSmallestUnit(100.99, Currency.USD)).toBe(BigInt(10099));
      expect(Money.toSmallestUnit(0.01, Currency.USD)).toBe(BigInt(1));
    });

    it('should convert JPY correctly (0 decimals)', () => {
      expect(Money.toSmallestUnit(1000, Currency.JPY)).toBe(BigInt(1000));
      expect(Money.toSmallestUnit(1000.5, Currency.JPY)).toBe(BigInt(1001));
    });

    it('should round correctly', () => {
      expect(Money.toSmallestUnit(10.555, Currency.NGN)).toBe(BigInt(1056));
      expect(Money.toSmallestUnit(10.554, Currency.NGN)).toBe(BigInt(1055));
    });
  });

  describe('fromSmallestUnit', () => {
    it('should convert kobo to NGN', () => {
      expect(Money.fromSmallestUnit(BigInt(1000050), Currency.NGN)).toBe(10000.5);
      expect(Money.fromSmallestUnit(BigInt(100), Currency.NGN)).toBe(1);
    });

    it('should convert cents to USD', () => {
      expect(Money.fromSmallestUnit(BigInt(10099), Currency.USD)).toBe(100.99);
    });

    it('should handle JPY (no conversion)', () => {
      expect(Money.fromSmallestUnit(BigInt(1000), Currency.JPY)).toBe(1000);
    });
  });

  describe('format', () => {
    it('should format NGN with symbol', () => {
      expect(Money.format(BigInt(1000050), Currency.NGN)).toBe('₦10,000.50');
    });

    it('should format USD with symbol', () => {
      expect(Money.format(BigInt(10099), Currency.USD)).toBe('$100.99');
    });

    it('should format JPY with no decimals', () => {
      expect(Money.format(BigInt(1000), Currency.JPY)).toBe('¥1,000');
    });
  });

  describe('arithmetic operations', () => {
    it('should add amounts correctly', () => {
      const a = BigInt(1000050);
      const b = BigInt(500025);
      expect(Money.add(a, b)).toBe(BigInt(1500075));
    });

    it('should subtract amounts correctly', () => {
      const a = BigInt(1000050);
      const b = BigInt(500025);
      expect(Money.subtract(a, b)).toBe(BigInt(500025));
    });

    it('should compare amounts correctly', () => {
      const a = BigInt(1000050);
      const b = BigInt(500025);

      expect(Money.isGreaterThan(a, b)).toBe(true);
      expect(Money.isLessThan(a, b)).toBe(false);
      expect(Money.equals(a, a)).toBe(true);
      expect(Money.equals(a, b)).toBe(false);
    });
  });

  describe('multiplyByRate', () => {
    it('should handle NGN to USD conversion', () => {
      const amountNGN = BigInt(1000000); // ₦10,000 in kobo
      const rate = 0.000625;
      const result = Money.multiplyByRate(amountNGN, rate);
      expect(result).toBe(BigInt(625)); // $6.25 in cents
    });

    it('should handle USD to NGN conversion', () => {
      const amountUSD = BigInt(10000); // $100 in cents
      const rate = 1600;
      const result = Money.multiplyByRate(amountUSD, rate);
      expect(result).toBe(BigInt(16000000)); // ₦160,000 in kobo
    });

    it('should handle small rates accurately', () => {
      const amount = BigInt(100000);
      const rate = 0.0000001;
      const result = Money.multiplyByRate(amount, rate);
      expect(result).toBeGreaterThanOrEqual(BigInt(0));
    });
  });

  describe('edge cases', () => {
    it('should handle zero', () => {
      expect(Money.toSmallestUnit(0, Currency.NGN)).toBe(BigInt(0));
      expect(Money.fromSmallestUnit(BigInt(0), Currency.NGN)).toBe(0);
      expect(Money.format(BigInt(0), Currency.NGN)).toBe('₦0.00');
    });

    it('should handle very large amounts', () => {
      const largeAmount = 999999999.99;
      const smallest = Money.toSmallestUnit(largeAmount, Currency.NGN);
      const back = Money.fromSmallestUnit(smallest, Currency.NGN);
      expect(back).toBeCloseTo(largeAmount, 2);
    });

    it('should be idempotent', () => {
      const original = 12345.67;
      const smallest = Money.toSmallestUnit(original, Currency.NGN);
      const restored = Money.fromSmallestUnit(smallest, Currency.NGN);
      expect(restored).toBe(original);
    });
  });
});
