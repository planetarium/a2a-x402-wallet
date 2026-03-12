import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;

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
              tokenUrl:               `${baseUrl}/a2a/device/poll`,
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
