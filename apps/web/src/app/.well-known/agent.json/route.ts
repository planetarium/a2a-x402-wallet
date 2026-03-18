import type { AgentCard, OAuth2SecurityScheme, OAuthFlows } from '@a2a-js/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  const baseUrl = process.env.APP_URL ?? `${proto}://${host}`;

  const card: AgentCard = {
    name:            'a2a-wallet',
    description:     'A2A-compatible wallet agent supporting x402 on-chain payment settlement.',
    url:             `${baseUrl}/api/a2a`,
    version:         '1.0.0',
    protocolVersion: '1.0',
    defaultInputModes:  ['text/plain'],
    defaultOutputModes: ['text/plain'],
    capabilities: {
      extensions: [
        {
          uri:         'https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2',
          description: 'Supports payments using the x402 protocol for on-chain settlement.',
          required:    true,
        },
      ],
    },
    skills: [],
    securitySchemes: {
      deviceFlow: {
        type: 'oauth2',
        flows: {
          deviceCode: {
            deviceAuthorizationUrl: `${baseUrl}/a2a/device/start`,
            tokenUrl:               `${baseUrl}/a2a/device/token`,
            scopes:                 {},
          },
        } as OAuthFlows,
      } as OAuth2SecurityScheme,
    },
    security: [{ deviceFlow: [] }],
  } as AgentCard;

  return NextResponse.json(card);
}
