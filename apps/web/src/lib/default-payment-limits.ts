import { NETWORKS } from '@a2a-x402-wallet/x402';

export interface DefaultPaymentLimit {
  network:   string;
  asset:     string;
  maxAmount: string;
}

export const DEFAULT_PAYMENT_LIMITS: DefaultPaymentLimit[] = [
  {
    network:   'base-sepolia',
    asset:     NETWORKS['base-sepolia'].usdcAddress.toLowerCase(),
    maxAmount: '1000000',
  },
];

export function mergeWithDefaults(
  userLimits: { network: string; asset: string; maxAmount: string }[],
): { network: string; asset: string; maxAmount: string; isDefault: boolean }[] {
  const userKeys = new Set(userLimits.map((l) => `${l.network}:${l.asset}`));

  const defaults = DEFAULT_PAYMENT_LIMITS
    .filter((d) => !userKeys.has(`${d.network}:${d.asset}`))
    .map((d) => ({ ...d, isDefault: true }));

  return [
    ...userLimits.map((l) => ({ ...l, isDefault: false })),
    ...defaults,
  ];
}

export function findDefault(network: string, asset: string): DefaultPaymentLimit | undefined {
  return DEFAULT_PAYMENT_LIMITS.find(
    (d) => d.network === network && d.asset === asset,
  );
}
