import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const expirationTime = process.env.JWT_EXPIRATION_TIME || '3650d';

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
