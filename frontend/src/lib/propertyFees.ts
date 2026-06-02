import { formatLocalizedNumber } from './international';

export const FIXED_TOURING_FEE_RWF = 5000;

export function formatMoney(value?: number, currency = 'RWF'): string {
  return `${currency} ${formatLocalizedNumber(value)}`;
}

export function formatRwf(value?: number): string {
  return formatLocalizedNumber(value);
}

export function getTouringFee(value?: number): number {
  return typeof value === 'number' ? value : FIXED_TOURING_FEE_RWF;
}
