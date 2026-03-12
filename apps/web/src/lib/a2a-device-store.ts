import { randomBytes } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from './db';
import { a2aDeviceCodes, a2aApiKeys } from './schema';

export interface A2ADeviceEntry {
  apiKey?: string;
  expiresAt: Date;
}

export interface A2ADeviceStore {
  create(code: string, ttlMs: number): Promise<void>;
  get(code: string): Promise<A2ADeviceEntry | undefined>;
  complete(code: string, apiKey: string): Promise<boolean>;
  delete(code: string): Promise<void>;
  validateApiKey(apiKey: string): Promise<boolean>;
}

export function generateApiKey(): string {
  return `sk-${randomBytes(24).toString('hex')}`;
}

class DbA2ADeviceStore implements A2ADeviceStore {
  async create(code: string, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    await db.insert(a2aDeviceCodes).values({ code, expiresAt });
  }

  async get(code: string): Promise<A2ADeviceEntry | undefined> {
    const now = new Date();
    const rows = await db
      .select()
      .from(a2aDeviceCodes)
      .where(and(eq(a2aDeviceCodes.code, code), gt(a2aDeviceCodes.expiresAt, now)))
      .limit(1);

    const row = rows[0];
    if (!row) return undefined;

    return {
      apiKey:    row.apiKey ?? undefined,
      expiresAt: row.expiresAt,
    };
  }

  /**
   * Stores the api_key on the device code row and inserts a persistent key
   * into a2a_api_keys. Returns false when the code is missing or expired.
   */
  async complete(code: string, apiKey: string): Promise<boolean> {
    const now = new Date();

    const result = await db
      .update(a2aDeviceCodes)
      .set({ apiKey })
      .where(and(eq(a2aDeviceCodes.code, code), gt(a2aDeviceCodes.expiresAt, now)))
      .returning({ code: a2aDeviceCodes.code });

    if (result.length === 0) return false;

    await db.insert(a2aApiKeys).values({ apiKey }).onConflictDoNothing();
    return true;
  }

  async delete(code: string): Promise<void> {
    await db.delete(a2aDeviceCodes).where(eq(a2aDeviceCodes.code, code));
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    const rows = await db
      .select({ apiKey: a2aApiKeys.apiKey })
      .from(a2aApiKeys)
      .where(eq(a2aApiKeys.apiKey, apiKey))
      .limit(1);

    return rows.length > 0;
  }
}

export const a2aDeviceStore: A2ADeviceStore = new DbA2ADeviceStore();
