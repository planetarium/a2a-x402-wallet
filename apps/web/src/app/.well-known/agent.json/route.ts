import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  const baseUrl = process.env.APP_URL ?? `${proto}://${host}`;

  const card = {
    name:    'a2a-wallet',
    url:     `${baseUrl}/api/a2a`,
    version: '1.0.0',
    securitySchemes: {
      deviceFlow: {
        oauth2SecurityScheme: {
          flows: {
            deviceCode: {
              deviceAuthorizationUrl: `${baseUrl}/a2a/device/start`,
              tokenUrl:               `${baseUrl}/a2a/device/token`,
              scopes:                 {},
            },
          },
        },
      },
    },
    securityRequirements: [{ deviceFlow: [] }],
  };

  return NextResponse.json(card);
}
