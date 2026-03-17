export interface PaymentRequirements {
  scheme: string;
  network: string;
  asset: `0x${string}`;
  payTo: `0x${string}`;
  maxAmountRequired: string;
  maxTimeoutSeconds?: number;
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

export type NetworkName = 'base' | 'base-sepolia';

export interface NetworkConfig {
  chainId: number;
  usdcAddress: `0x${string}`;
  usdcEip712: { name: string; version: string };
}
