export enum Currency {
  NGN = 'NGN', // Nigerian Naira
  USD = 'USD', // US Dollar
  EUR = 'EUR', // Euro
  GBP = 'GBP', // British Pound
  JPY = 'JPY', // Japanese Yen
  CAD = 'CAD', // Canadian Dollar
  AUD = 'AUD', // Australian Dollar
  CHF = 'CHF', // Swiss Franc
  CNY = 'CNY', // Chinese Yuan
  INR = 'INR', // Indian Rupee
  ZAR = 'ZAR', // South African Rand
}

// Currency configuration
export const CURRENCY_CONFIG: Record<
  Partial<Currency>,
  { decimals: number; symbol: string; name: string }
> = {
  [Currency.NGN]: { decimals: 2, symbol: '₦', name: 'kobo' },
  [Currency.USD]: { decimals: 2, symbol: '$', name: 'cents' },
  [Currency.EUR]: { decimals: 2, symbol: '€', name: 'cents' },
  [Currency.GBP]: { decimals: 2, symbol: '£', name: 'pence' },
  [Currency.JPY]: { decimals: 0, symbol: '¥', name: 'yen' },
  [Currency.CAD]: { decimals: 2, symbol: 'C$', name: 'cents' },
  [Currency.AUD]: { decimals: 2, symbol: 'A$', name: 'cents' },
  [Currency.CHF]: { decimals: 2, symbol: 'CHF', name: 'rappen' },
  [Currency.CNY]: { decimals: 2, symbol: '¥', name: 'fen' },
  [Currency.INR]: { decimals: 2, symbol: '₹', name: 'paise' },
  [Currency.ZAR]: { decimals: 2, symbol: 'R', name: 'cents' },
};
