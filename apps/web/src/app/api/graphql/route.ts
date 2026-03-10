import { createYoga } from 'graphql-yoga';
import { NextRequest } from 'next/server';
import { schema } from '@/lib/graphql/schema';
import { privy } from '@/lib/privy';

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  context: async ({ request }) => {
    const token = request.headers.get('Authorization')?.slice(7) ?? null;
    if (!token) return { userId: null, walletId: null };

    // Only Privy access tokens are accepted (web UI flow only)
    try {
      const claims = await privy.verifyAuthToken(token);
      return { userId: claims.userId, walletId: null };
    } catch {
      return { userId: null, walletId: null };
    }
  },
});

export async function GET(request: NextRequest) {
  return yoga.handleRequest(request, {});
}

export async function POST(request: NextRequest) {
  return yoga.handleRequest(request, {});
}
