import type { AgentCard, OAuth2SecurityScheme } from '@a2a-js/sdk';
import { DefaultAgentCardResolver } from '@a2a-js/sdk/client';

export interface DeviceCodeFlow {
  deviceAuthorizationUrl: string;
  tokenUrl: string;
}

export async function fetchAgentCard(url: string): Promise<AgentCard> {
  const resolver = new DefaultAgentCardResolver();
  return resolver.resolve(url);
}

export function findDeviceCodeFlow(card: AgentCard): DeviceCodeFlow | null {
  const { security, securitySchemes } = card;
  if (!security || !securitySchemes) return null;

  // security is an OR-of-ANDs list: each object is a set of scheme names that
  // must all be satisfied together. Collect the union of all referenced scheme names.
  const referencedSchemeNames = new Set(
    security.flatMap((requirement) => Object.keys(requirement)),
  );

  for (const name of referencedSchemeNames) {
    const scheme = securitySchemes[name];
    if (!scheme || scheme.type !== 'oauth2') continue;

    // deviceCode is a non-standard extension to OAuthFlows (A2A spec §4.5.10,
    // not yet implemented in @a2a-js/sdk)
    const flows = (scheme as OAuth2SecurityScheme).flows as Record<string, unknown>;
    const dc = flows.deviceCode as { deviceAuthorizationUrl?: string; tokenUrl?: string } | undefined;
    if (typeof dc?.deviceAuthorizationUrl === 'string' && typeof dc?.tokenUrl === 'string') {
      return {
        deviceAuthorizationUrl: dc.deviceAuthorizationUrl,
        tokenUrl: dc.tokenUrl,
      };
    }
  }
  return null;
}
