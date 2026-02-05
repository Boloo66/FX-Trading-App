import { Currency, CURRENCY_CONFIG } from '../enums/currency.enum';

export class Money {
  static toSmallestUnit(amount: number, currency: Currency): bigint {
    const decimals = CURRENCY_CONFIG[currency].decimals;
    const multiplier = Math.pow(10, decimals);
    return BigInt(Math.round(amount * multiplier));
  }

  static fromSmallestUnit(amount: bigint, currency: Currency): number {
    const decimals = CURRENCY_CONFIG[currency].decimals;
    const divisor = Math.pow(10, decimals);
    return Number(amount) / divisor;
  }

  static format(amount: bigint, currency: Currency): string {
    const displayAmount = Money.fromSmallestUnit(amount, currency);
    const config = CURRENCY_CONFIG[currency];
    return `${config.symbol}${displayAmount.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    })}`;
  }

  static add(a: bigint, b: bigint): bigint {
    return a + b;
  }

  static subtract(a: bigint, b: bigint): bigint {
    return a - b;
  }

  static multiplyByRate(amount: bigint, rate: number): bigint {
    const rateString = rate.toFixed(10);
    const rateBigInt = BigInt(Math.round(parseFloat(rateString) * 1e10));
    const result = (amount * rateBigInt) / BigInt(1e10);
    return result;
  }

  static isGreaterThan(a: bigint, b: bigint): boolean {
    return a > b;
  }

  static isLessThan(a: bigint, b: bigint): boolean {
    return a < b;
  }

  static isGreaterThanOrEqual(a: bigint, b: bigint): boolean {
    return a >= b;
  }

  static isLessThanOrEqual(a: bigint, b: bigint): boolean {
    return a <= b;
  }

  static equals(a: bigint, b: bigint): boolean {
    return a === b;
  }

  static min(a: bigint, b: bigint): bigint {
    return a < b ? a : b;
  }

  static max(a: bigint, b: bigint): bigint {
    return a > b ? a : b;
  }

  static abs(a: bigint): bigint {
    return a < 0n ? -a : a;
  }

  static isPositive(a: bigint): boolean {
    return a > 0n;
  }

  static isNegative(a: bigint): boolean {
    return a < 0n;
  }

  static isZero(a: bigint): boolean {
    return a === 0n;
  }
}
