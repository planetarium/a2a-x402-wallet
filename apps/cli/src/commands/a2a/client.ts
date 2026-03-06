import { ClientFactory, ClientFactoryOptions, JsonRpcTransportFactory, RestTransportFactory } from '@a2a-js/sdk/client';

/**
 * Build a ClientFactory with an optional Bearer token injected into every request.
 */
export function buildClientFactory(bearer?: string): ClientFactory {
  if (!bearer) return new ClientFactory();

  const authFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${bearer}`);
    return fetch(input, { ...init, headers });
  };

  const options = ClientFactoryOptions.createFrom(ClientFactoryOptions.default, {
    transports: [
      new JsonRpcTransportFactory({ fetchImpl: authFetch }),
      new RestTransportFactory({ fetchImpl: authFetch }),
    ],
  });

  return new ClientFactory(options);
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
