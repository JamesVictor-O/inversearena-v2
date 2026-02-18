export type Currency = 'USDC' | 'ETH';

interface ValidateStakeAmountParams {
  amount: string;
  currency: Currency;
  minStake: number;
  maxStake: number;
}

export function validateStakeAmount({
  amount,
  currency,
  minStake,
  maxStake,
}: ValidateStakeAmountParams): { isValid: boolean; error?: string } {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return { isValid: false, error: 'Please enter a valid amount' };
  if (num < minStake) return { isValid: false, error: `Minimum stake is ${minStake} ${currency}` };
  if (num > maxStake) return { isValid: false, error: 'Insufficient balance' };
  return { isValid: true };
}

export function sanitizeNumericInput(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

export function formatCurrencyInput(value: string, currency: Currency): string {
  if (!value) return value;
  const decimals = getDecimalPrecision(currency);
  const parts = value.split('.');
  if (parts[1] && parts[1].length > decimals) {
    return `${parts[0]}.${parts[1].slice(0, decimals)}`;
  }
  return value;
}

export function getDecimalPrecision(currency: Currency): number {
  switch (currency) {
    case 'ETH': return 6;
    case 'USDC': return 2;
    default: return 2;
  }
}
