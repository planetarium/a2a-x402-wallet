export interface DeviceEndpoints {
  deviceAuthorizationEndpoint: string;
  tokenEndpoint: string;
}

const cache = new Map<string, DeviceEndpoints>();

const DISCOVERY_TIMEOUT_MS = 5_000;

function defaultEndpoints(baseUrl: string): DeviceEndpoints {
  return {
    deviceAuthorizationEndpoint: `${baseUrl}/api/device/authorize`,
    tokenEndpoint: `${baseUrl}/api/device/token`,
  };
}

async function fetchMetadata(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractEndpoints(
  baseUrl: string,
  metadata: Record<string, unknown>,
): DeviceEndpoints | null {
  const device = metadata.device_authorization_endpoint;
  const token = metadata.token_endpoint;
  if (typeof device === 'string' && typeof token === 'string') {
    return { deviceAuthorizationEndpoint: device, tokenEndpoint: token };
  }
  return null;
}

export async function discoverDeviceEndpoints(baseUrl: string): Promise<DeviceEndpoints> {
  const cached = cache.get(baseUrl);
  if (cached) return cached;

  // 1) RFC 8414
  const rfc8414 = await fetchMetadata(`${baseUrl}/.well-known/oauth-authorization-server`);
  if (rfc8414) {
    const endpoints = extractEndpoints(baseUrl, rfc8414);
    if (endpoints) {
      cache.set(baseUrl, endpoints);
      return endpoints;
    }
  }

  // 2) OIDC Discovery
  const oidc = await fetchMetadata(`${baseUrl}/.well-known/openid-configuration`);
  if (oidc) {
    const endpoints = extractEndpoints(baseUrl, oidc);
    if (endpoints) {
      cache.set(baseUrl, endpoints);
      return endpoints;
    }
  }

  // 3) Fallback
  const fallback = defaultEndpoints(baseUrl);
  cache.set(baseUrl, fallback);
  return fallback;
}
