// x402 Protocol Types and Utilities

export interface PaymentRequirements {
  scheme: string;
  network: string;
  asset: `0x${string}`;
  payTo: `0x${string}`;
  maxAmountRequired: string;
  resource?: string;
  description?: string;
  mimeType?: string;
  outputSchema?: unknown;
  estimatedProcessingTime?: number;
  extra?: Record<string, unknown>;
}

export interface TransferWithAuthorizationPayload {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
}

export interface ExactSchemePayload {
  signature: `0x${string}`;
  authorization: TransferWithAuthorizationPayload;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: ExactSchemePayload;
}

// Network → chainId mapping
const NETWORK_CHAIN_IDS: Record<string, number> = {
  'base': 8453,
  'base-sepolia': 84532,
  'ethereum': 1,
  'optimism': 10,
  'arbitrum': 42161,
};

// Well-known ERC-3009 token EIP-712 domain metadata
// Keys are lowercase checksummed addresses
const TOKEN_METADATA: Record<string, { name: string; version: string }> = {
  // Base Mainnet USDC
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { name: 'USD Coin', version: '2' },
  // Base Sepolia USDC
  '0x036cbd53842c5426634e7929541ec2318f3dcf7e': { name: 'USD Coin', version: '2' },
  // Ethereum Mainnet USDC
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { name: 'USD Coin', version: '2' },
  // Optimism USDC
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { name: 'USD Coin', version: '2' },
  // Arbitrum USDC
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { name: 'USD Coin', version: '2' },
};

export function getChainId(network: string): number {
  const chainId = NETWORK_CHAIN_IDS[network];
  if (chainId === undefined) throw new Error(`Unsupported network: ${network}`);
  return chainId;
}

export function getTokenMetadata(asset: string): { name: string; version: string } {
  return TOKEN_METADATA[asset.toLowerCase()] ?? { name: 'USD Coin', version: '2' };
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
