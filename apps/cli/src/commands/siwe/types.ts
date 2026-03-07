export interface SiweFields {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expiresAt?: string;
}

export interface SiweTokenPayload {
  message: string;
  signature: string;
}
