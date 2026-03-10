import { USDC_DECIMALS } from '@a2a-x402-wallet/x402';
import { formatUnits } from 'viem';

/** Base units → "$1.000000" (full USDC precision) */
export function formatUsdcAmountFull(baseUnits: string): string {
  try {
    const value = formatUnits(BigInt(baseUnits), USDC_DECIMALS);
    const num = parseFloat(value);
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: USDC_DECIMALS, maximumFractionDigits: USDC_DECIMALS })}`;
  } catch {
    return '';
  }
}
