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
    skills: [
      {
        id:          'x402-payment-settlement',
        name:        'x402 Payment Settlement',
        description: 'Accepts service requests that require payment. Responds with an x402 payment requirement, verifies the client-submitted EIP-712 signed payment payload, and settles the transaction on-chain via the x402 Facilitator. Supports USDC payments using the exact payment scheme.',
        tags:        ['x402', 'payment', 'wallet', 'on-chain', 'settlement', 'USDC', 'EIP-712', 'blockchain', 'crypto', 'stablecoin'],
        examples: [
          'I want to use this service. Here is my x402 payment.',
          'Process my USDC payment on Base network.',
          'Submit a signed x402 payment payload for settlement.',
          'Pay for API access using x402 protocol.',
        ],
      },
    ],
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
