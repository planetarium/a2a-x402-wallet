export type {
  PaymentRequirements,
  TransferWithAuthorizationPayload,
  ExactSchemePayload,
  PaymentPayload,
  NetworkName,
  NetworkConfig,
} from './types.js';

import type { NetworkName, NetworkConfig, TransferWithAuthorizationPayload } from './types.js';

export { X402Facilitator } from './facilitator.js';

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  'base': {
    chainId: 8453,
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdcEip712: { name: 'USDC', version: '2' },
  },
  'base-sepolia': {
    chainId: 84532,
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdcEip712: { name: 'USDC', version: '2' },
  },
};

export const USDC_DECIMALS = 6;

export function getChainId(network: string): number {
  const cfg = NETWORKS[network as NetworkName];
  if (!cfg) throw new Error(`Unsupported network: ${network}`);
  return cfg.chainId;
}

export function getTokenMetadata(asset: string): { name: string; version: string } {
  const lower = asset.toLowerCase();
  for (const cfg of Object.values(NETWORKS)) {
    if (cfg.usdcAddress.toLowerCase() === lower) return cfg.usdcEip712;
  }
  throw new Error(`Unsupported token: ${asset}`);
}

export function generateNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

export function buildTransferWithAuthorizationTypedData(
  asset: `0x${string}`,
  chainId: number,
  tokenName: string,
  tokenVersion: string,
  authorization: TransferWithAuthorizationPayload,
) {
  return {
    domain: {
      name: tokenName,
      version: tokenVersion,
      chainId,
      verifyingContract: asset,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization' as const,
    message: {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce,
    },
  };
}
