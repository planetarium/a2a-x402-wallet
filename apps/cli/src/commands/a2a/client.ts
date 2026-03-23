import { HTTP_EXTENSION_HEADER } from '@a2a-js/sdk';
import { ClientFactory, ClientFactoryOptions, JsonRpcTransportFactory, RestTransportFactory } from '@a2a-js/sdk/client';

const X402_EXTENSION_URI = 'https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2';

/**
 * Build a ClientFactory with an optional Bearer token injected into every request.
 * Always includes the X-A2A-Extensions header per the x402 spec (Section 8).
 */
export function buildClientFactory(bearer?: string): ClientFactory {
  const baseFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set(HTTP_EXTENSION_HEADER, X402_EXTENSION_URI);
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    return fetch(input, { ...init, headers });
  };

  const options = ClientFactoryOptions.createFrom(ClientFactoryOptions.default, {
    transports: [
      new JsonRpcTransportFactory({ fetchImpl: baseFetch }),
      new RestTransportFactory({ fetchImpl: baseFetch }),
    ],
  });

  return new ClientFactory(options);
}

/**
 * JSON replacer that truncates base64 `bytes` fields to avoid flooding the terminal.
 * Replaces any string value for the key "bytes" longer than 64 chars with a placeholder.
 */
export function bytesReplacer(_key: string, value: unknown): unknown {
  if (_key === 'bytes' && typeof value === 'string' && value.length > 64) {
    return `<base64 ~${value.length} chars>`;
  }
  return value;
}

/**
 * Format an SDK error into a human-readable message.
 * The SDK maps JSON-RPC errors to typed errors but drops the detail in the message.
 */
export function formatA2AError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);

  // TaskNotFoundJSONRPCError etc. carry the raw errorResponse on the instance
  const rpcErr = err as Error & { errorResponse?: { error?: { code?: number; message?: string; data?: unknown } } };
  if (rpcErr.errorResponse?.error) {
    const { code, message, data } = rpcErr.errorResponse.error;
    let detail = `JSON-RPC error ${code}: ${message}`;
    if (data) detail += `\n  data: ${JSON.stringify(data)}`;
    return detail;
  }

  return err.message;
}
