import { describe, it, expect, vi, beforeEach } from 'vitest';

// Reset module cache between tests so the in-memory cache is fresh
let discoverDeviceEndpoints: typeof import('../lib/oauth-discovery.js').discoverDeviceEndpoints;

const BASE_URL = 'https://example.com';

beforeEach(async () => {
  vi.restoreAllMocks();
  // Re-import to reset the in-memory endpoint cache
  vi.resetModules();
  const mod = await import('../lib/oauth-discovery.js');
  discoverDeviceEndpoints = mod.discoverDeviceEndpoints;
});

describe('discoverDeviceEndpoints', () => {
  it('uses RFC 8414 metadata when available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        device_authorization_endpoint: 'https://example.com/v1/device/authorize',
        token_endpoint: 'https://example.com/v1/token',
      }),
    }));

    const endpoints = await discoverDeviceEndpoints(BASE_URL);

    expect(endpoints).toEqual({
      deviceAuthorizationEndpoint: 'https://example.com/v1/device/authorize',
      tokenEndpoint: 'https://example.com/v1/token',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/.well-known/oauth-authorization-server`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('falls back to OIDC Discovery when RFC 8414 returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 }) // RFC 8414 fails
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_authorization_endpoint: 'https://example.com/oidc/device',
          token_endpoint: 'https://example.com/oidc/token',
          issuer: 'https://example.com',
        }),
      }),
    );

    const endpoints = await discoverDeviceEndpoints(BASE_URL);

    expect(endpoints).toEqual({
      deviceAuthorizationEndpoint: 'https://example.com/oidc/device',
      tokenEndpoint: 'https://example.com/oidc/token',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to hardcoded paths when both discovery endpoints fail', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 }),
    );

    const endpoints = await discoverDeviceEndpoints(BASE_URL);

    expect(endpoints).toEqual({
      deviceAuthorizationEndpoint: `${BASE_URL}/api/device/authorize`,
      tokenEndpoint: `${BASE_URL}/api/device/token`,
    });
  });

  it('falls back to hardcoded paths when fetch throws (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error')),
    );

    const endpoints = await discoverDeviceEndpoints(BASE_URL);

    expect(endpoints).toEqual({
      deviceAuthorizationEndpoint: `${BASE_URL}/api/device/authorize`,
      tokenEndpoint: `${BASE_URL}/api/device/token`,
    });
  });

  it('falls back when metadata is missing required fields', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issuer: 'https://example.com' }), // no device/token endpoints
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token_endpoint: 'https://example.com/token' }), // missing device endpoint
      }),
    );

    const endpoints = await discoverDeviceEndpoints(BASE_URL);

    expect(endpoints).toEqual({
      deviceAuthorizationEndpoint: `${BASE_URL}/api/device/authorize`,
      tokenEndpoint: `${BASE_URL}/api/device/token`,
    });
  });

  it('caches results and does not fetch again for same baseUrl', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 }),
    );

    const first = await discoverDeviceEndpoints(BASE_URL);
    const second = await discoverDeviceEndpoints(BASE_URL);

    expect(first).toEqual(second);
    // Only 2 fetch calls total (RFC 8414 + OIDC), not 4
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
