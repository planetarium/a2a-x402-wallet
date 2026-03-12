import { DefaultAgentCardResolver } from '@a2a-js/sdk/client';

export interface DeviceCodeFlow {
  deviceAuthorizationUrl: string;
  tokenUrl: string;
}

export async function fetchAgentCard(url: string): Promise<unknown> {
  const resolver = new DefaultAgentCardResolver();
  return resolver.resolve(url);
}

export function findDeviceCodeFlow(card: unknown): DeviceCodeFlow | null {
  const schemes = (card as Record<string, unknown>)?.securitySchemes;
  if (!schemes || typeof schemes !== 'object') return null;

  for (const scheme of Object.values(schemes)) {
    const flow = (scheme as Record<string, unknown>)?.oauth2SecurityScheme as
      | Record<string, unknown>
      | undefined;
    const deviceCode = flow?.flows as Record<string, unknown> | undefined;
    const dc = deviceCode?.deviceCode as Record<string, unknown> | undefined;
    if (typeof dc?.deviceAuthorizationUrl === 'string' && typeof dc?.tokenUrl === 'string') {
      return {
        deviceAuthorizationUrl: dc.deviceAuthorizationUrl,
        tokenUrl: dc.tokenUrl,
      };
    }
  }
  return null;
}
