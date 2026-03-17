import type { PaymentPayload, PaymentRequirements } from './types.js';

// ---------------------------------------------------------------------------
// Facilitator client
// ---------------------------------------------------------------------------

export class X402Facilitator {
  constructor(private readonly url: string) {}

  async verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<{ valid: boolean; reason?: string; payer?: string }> {
    let response: Response;
    try {
      response = await fetch(`${this.url}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x402Version: 1, paymentPayload: payload, paymentRequirements: requirements }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { valid: false, reason: `facilitator_unreachable: ${msg}` };
    }

    const data = await response.json() as {
      isValid: boolean;
      invalidReason?: string;
      payer?: string;
    };

    if (!response.ok) return { valid: false, reason: data.invalidReason ?? `http_${response.status}` };
    return { valid: data.isValid, reason: data.invalidReason, payer: data.payer };
  }

  async settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<{ success: boolean; transaction: string; network: string; payer?: string; errorReason?: string }> {
    let response: Response;
    try {
      response = await fetch(`${this.url}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x402Version: 1, paymentPayload: payload, paymentRequirements: requirements }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, transaction: '', network: requirements.network, errorReason: `facilitator_unreachable: ${msg}` };
    }

    const data = await response.json() as {
      success: boolean;
      transaction: string;
      network: string;
      payer?: string;
      errorReason?: string;
    };

    if (!response.ok || !data.success) {
      return {
        success: false,
        transaction: data.transaction ?? '',
        network: data.network ?? requirements.network,
        payer: data.payer,
        errorReason: data.errorReason ?? `http_${response.status}`,
      };
    }
    return { success: true, transaction: data.transaction, network: data.network, payer: data.payer };
  }
}
