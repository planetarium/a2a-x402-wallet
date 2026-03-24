import { privateKeyToAccount } from 'viem/accounts';
import {
  buildTransferWithAuthorizationTypedData,
  generateNonce,
  getChainId,
  getTokenMetadata,
  type PaymentPayload,
  type PaymentRequirements,
  type TransferWithAuthorizationPayload,
} from '@a2a-x402-wallet/x402';
import { callSign, callX402Sign, exitNotLoggedIn, type X402SignRequestBody } from '../api/custody-wallet.js';
import { resolveWalletAddress } from '../commands/siwe/helpers.js';
import { readConfig, getEffectiveConfig } from '../store/config.js';
import { LocalWalletProvider } from './local.js';
import type { ActiveWallet } from './provider.js';

// Set validAfter slightly in the past to tolerate clock skew between payer and verifier (ERC-3009 best practice)
const CLOCK_SKEW_TOLERANCE_S = 600;

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface WalletSigner {
  /** Returns the checksummed Ethereum address for this signer. */
  getAddress(): Promise<`0x${string}`>;

  /**
   * Signs an arbitrary message (EIP-191 personal_sign).
   * Returns the 0x-prefixed hex signature.
   */
  signMessage(message: string): Promise<`0x${string}`>;

  /**
   * Builds and signs an x402 PaymentPayload (ERC-3009 TransferWithAuthorization).
   * The "exact" scheme is the only scheme currently supported.
   */
  signX402Payment(
    requirements: PaymentRequirements,
    validForSeconds?: number,
  ): Promise<PaymentPayload>;
}

// ---------------------------------------------------------------------------
// Custodial implementation — delegates to the web API
// ---------------------------------------------------------------------------

export class CustodialWalletSigner implements WalletSigner {
  private cachedAddress: `0x${string}` | undefined;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async getAddress(): Promise<`0x${string}`> {
    if (!this.cachedAddress) {
      this.cachedAddress = (await resolveWalletAddress(this.baseUrl, this.token)) as `0x${string}`;
    }
    return this.cachedAddress;
  }

  async signMessage(message: string): Promise<`0x${string}`> {
    const result = await callSign(this.baseUrl, this.token, message) as { signature: string };
    return result.signature as `0x${string}`;
  }

  async signX402Payment(
    requirements: PaymentRequirements,
    validForSeconds = 3600,
  ): Promise<PaymentPayload> {
    const body: X402SignRequestBody = { paymentRequirements: requirements, validForSeconds };
    const result = await callX402Sign(this.baseUrl, this.token, body);
    return result as PaymentPayload;
  }
}

// ---------------------------------------------------------------------------
// Local implementation — signs with a locally-held private key
// ---------------------------------------------------------------------------

export class LocalWalletSigner implements WalletSigner {
  private readonly account: ReturnType<typeof privateKeyToAccount>;

  constructor(wallet: ActiveWallet) {
    this.account = privateKeyToAccount(wallet.privateKey);
  }

  async getAddress(): Promise<`0x${string}`> {
    return this.account.address;
  }

  async signMessage(message: string): Promise<`0x${string}`> {
    return this.account.signMessage({ message });
  }

  async signX402Payment(
    requirements: PaymentRequirements,
    validForSeconds = 3600,
  ): Promise<PaymentPayload> {
    if (requirements.scheme !== 'exact') {
      throw new Error(`Unsupported scheme: ${requirements.scheme}. Only "exact" is supported.`);
    }

    const chainId = getChainId(requirements.network);

    const extraName = typeof requirements.extra?.['name'] === 'string' ? requirements.extra['name'] : undefined;
    const extraVersion = typeof requirements.extra?.['version'] === 'string' ? requirements.extra['version'] : undefined;
    const tokenMeta = (extraName && extraVersion)
      ? { name: extraName, version: extraVersion }
      : getTokenMetadata(requirements.asset);

    const now = Math.floor(Date.now() / 1000);
    const validSeconds = requirements.maxTimeoutSeconds ?? validForSeconds;
    const authorization: TransferWithAuthorizationPayload = {
      from: this.account.address,
      to: requirements.payTo,
      value: requirements.maxAmountRequired,
      validAfter: String(now - CLOCK_SKEW_TOLERANCE_S),
      validBefore: String(now + validSeconds),
      nonce: generateNonce(),
    };

    const typedData = buildTransferWithAuthorizationTypedData(
      requirements.asset,
      chainId,
      tokenMeta.name,
      tokenMeta.version,
      authorization,
    );

    const signature = await this.account.signTypedData(typedData);

    return {
      x402Version: 1,
      scheme: 'exact',
      network: requirements.network,
      payload: { signature, authorization },
    };
  }
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Build a signer that calls the web API (requires a valid JWT). */
export function makeCustodialSigner(baseUrl: string, token: string): WalletSigner {
  return new CustodialWalletSigner(baseUrl, token);
}

/** Build a signer backed by a locally-decrypted wallet. */
export function makeLocalSigner(wallet: ActiveWallet): WalletSigner {
  return new LocalWalletSigner(wallet);
}

// ---------------------------------------------------------------------------
// Signer resolution
// ---------------------------------------------------------------------------

/**
 * Per-command overrides that take precedence over the stored config.
 * Maps to CLI flags: --wallet, --token, --url
 */
export interface SignerOverrides {
  /** Force a specific local wallet by name (--wallet flag). */
  wallet?: string;
  /** Force the custodial wallet regardless of the configured default (--custodial flag). */
  custodial?: boolean;
  /** Override the JWT used for custodial signing (--token flag). */
  token?: string;
  /** Override the web app base URL (--url flag). */
  url?: string;
}

/**
 * Resolves the WalletSigner from config and optional per-command overrides.
 * Flags always take precedence over the stored default wallet.
 *
 * Priority order:
 *   1. overrides.wallet    → local wallet  (--wallet flag)
 *   2. overrides.custodial → custodial     (--custodial flag, uses stored/overridden token)
 *   3. overrides.token     → custodial     (--token flag)
 *   4. config.defaultWallet.type === 'local'     → local wallet
 *   5. config.defaultWallet.type === 'custodial' → custodial (requires token)
 *   6. config.token present                      → custodial (implicit fallback)
 *   7. nothing configured                        → exits with hint to run "wallet connect"
 */
export async function resolveSigner(overrides?: SignerOverrides): Promise<WalletSigner> {
  if (overrides?.wallet && overrides.custodial) {
    throw new Error('--wallet and --custodial are mutually exclusive.');
  }

  const provider = new LocalWalletProvider();

  // 1. Explicit local wallet override (--wallet flag)
  if (overrides?.wallet) {
    return makeLocalSigner(await provider.load(overrides.wallet));
  }

  const cfg = getEffectiveConfig(overrides);

  // 2. Explicit custodial override (--custodial flag)
  if (overrides?.custodial) {
    if (!cfg.token) exitNotLoggedIn();
    return makeCustodialSigner(cfg.url, cfg.token);
  }

  // 3. Explicit JWT override (--token flag)
  if (overrides?.token) {
    return makeCustodialSigner(cfg.url, overrides.token);
  }

  const config = readConfig();
  const defaultWallet = config.defaultWallet;

  if (defaultWallet) {
    // 3. Default local wallet
    if (defaultWallet.type === 'local') {
      return makeLocalSigner(await provider.load(defaultWallet.name));
    }
    // 4. Default custodial wallet
    if (!cfg.token) exitNotLoggedIn();
    return makeCustodialSigner(cfg.url, cfg.token);
  }

  // 5. Implicit custodial fallback (logged in but no default wallet set)
  if (cfg.token) {
    return makeCustodialSigner(cfg.url, cfg.token);
  }

  // 6. Nothing configured
  exitNotLoggedIn();
}
