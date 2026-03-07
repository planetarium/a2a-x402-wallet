import { SignJWT, jwtVerify } from 'jose';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required');
const secret = new TextEncoder().encode(jwtSecret);
const expirationTime = process.env.JWT_EXPIRATION_TIME || '5m';

export async function signJwt(userId: string, walletId: string): Promise<string> {
  return new SignJWT({ sub: userId, walletId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<{ sub: string; walletId: string }> {
  const { payload } = await jwtVerify(token, secret);
  if (!payload.sub) throw new Error('Missing sub claim');
  if (!payload.walletId || typeof payload.walletId !== 'string') throw new Error('Missing walletId claim');
  return { sub: payload.sub, walletId: payload.walletId };
}
