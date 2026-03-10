import type { AgentCard } from '@a2a-js/sdk';
import {
  AgentCardResolver,
  ClientFactory,
  ClientFactoryOptions,
  JsonRpcTransportFactory,
  RestTransportFactory,
  ServiceParameters,
  withA2AExtensions,
} from '@a2a-js/sdk/client';
import type { Client, RequestOptions } from '@a2a-js/sdk/client';

const X402_EXTENSION_URI = 'https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2';

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
 * Resolve the agent card, create a client, and build x402 request options if applicable.
 */
export async function createClientWithX402(factory: ClientFactory, url: string): Promise<{
  client: Client;
  requestOptions: RequestOptions | undefined;
}> {
  const card = await AgentCardResolver.default.resolve(url);
  const client = await factory.createFromAgentCard(card);
  const requestOptions = buildX402RequestOptions(card);
  return { client, requestOptions };
}

function buildX402RequestOptions(card: AgentCard): RequestOptions | undefined {
  const extensions = card.capabilities?.extensions ?? [];
  const hasX402 = extensions.some((ext) => ext.uri === X402_EXTENSION_URI);

  if (!hasX402) return undefined;

  return {
    serviceParameters: ServiceParameters.create(
      withA2AExtensions(X402_EXTENSION_URI),
    ),
  };
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
