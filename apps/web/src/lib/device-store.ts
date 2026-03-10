// DB-backed device code store for Device Code Flow (RFC 8628 style).
// Replaces the previous in-memory implementation to support horizontal scaling
// across multiple server instances without shared state.

import { and, eq, gt } from 'drizzle-orm';
import { db } from './db';
import { deviceNonces } from './schema';

export interface DeviceEntry {
  token?: string;
  expiresAt: Date;
}

export interface DeviceStore {
  create(nonce: string, ttlMs: number): Promise<void>;
  get(nonce: string): Promise<DeviceEntry | undefined>;
  complete(nonce: string, token: string): Promise<boolean>;
  delete(nonce: string): Promise<void>;
}

class DbDeviceStore implements DeviceStore {
  /**
   * Inserts a new nonce row with an expiry derived from the given TTL.
   */
  async create(nonce: string, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    await db.insert(deviceNonces).values({ nonce, expiresAt });
  }

  /**
   * Returns the entry for the given nonce only if it exists and has not expired.
   * Expiry is enforced at query time; no periodic cleanup job is needed.
   */
  async get(nonce: string): Promise<DeviceEntry | undefined> {
    const now = new Date();
    const rows = await db
      .select()
      .from(deviceNonces)
      .where(
        and(
          eq(deviceNonces.nonce, nonce),
          gt(deviceNonces.expiresAt, now),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return undefined;

    return {
      token:     row.token ?? undefined,
      expiresAt: row.expiresAt,
    };
  }

  /**
   * Sets the JWT token on a nonce row, but only if the row exists and has not expired.
   * Returns false when the nonce is missing or already expired.
   */
  async complete(nonce: string, token: string): Promise<boolean> {
    const now = new Date();
    const result = await db
      .update(deviceNonces)
      .set({ token })
      .where(
        and(
          eq(deviceNonces.nonce, nonce),
          gt(deviceNonces.expiresAt, now),
        ),
      )
      .returning({ nonce: deviceNonces.nonce });

    return result.length > 0;
  }

  /**
   * Removes the nonce row from the database (called after the token is consumed).
   */
  async delete(nonce: string): Promise<void> {
    await db.delete(deviceNonces).where(eq(deviceNonces.nonce, nonce));
  }
}

// Module-level singleton — one DB connection pool is shared across all
// API route invocations within the same process.
export const deviceStore: DeviceStore = new DbDeviceStore();
