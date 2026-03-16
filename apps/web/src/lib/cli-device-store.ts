// DB-backed device code store for the RFC 8628-compliant CLI Device Authorization Flow.
// Uses two identifiers per session:
//   device_code — opaque secret polled by the CLI
//   user_code   — short human-readable code entered/confirmed by the user in the browser

import { and, eq, gt } from 'drizzle-orm';
import { db } from './db';
import { cliDeviceCodes } from './schema';

export type CliDeviceStatus = 'pending' | 'complete' | 'denied';

export interface CliDeviceEntry {
  deviceCode: string;
  userCode:   string;
  token?:     string;
  status:     CliDeviceStatus;
  expiresAt:  Date;
}

export interface CliDeviceStore {
  create(deviceCode: string, userCode: string, ttlMs: number): Promise<void>;
  getByDeviceCode(deviceCode: string): Promise<CliDeviceEntry | undefined>;
  getByUserCode(userCode: string): Promise<CliDeviceEntry | undefined>;
  /** Mark the session as complete and store the issued JWT. */
  complete(userCode: string, token: string): Promise<boolean>;
  /** Mark the session as denied (user explicitly rejected). */
  deny(userCode: string): Promise<boolean>;
  deleteByDeviceCode(deviceCode: string): Promise<void>;
}

class DbCliDeviceStore implements CliDeviceStore {
  async create(deviceCode: string, userCode: string, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    await db.insert(cliDeviceCodes).values({ deviceCode, userCode, expiresAt });
  }

  async getByDeviceCode(deviceCode: string): Promise<CliDeviceEntry | undefined> {
    const now = new Date();
    const rows = await db
      .select()
      .from(cliDeviceCodes)
      .where(
        and(
          eq(cliDeviceCodes.deviceCode, deviceCode),
          gt(cliDeviceCodes.expiresAt, now),
        ),
      )
      .limit(1);

    return rows[0] ? toEntry(rows[0]) : undefined;
  }

  async getByUserCode(userCode: string): Promise<CliDeviceEntry | undefined> {
    const now = new Date();
    const rows = await db
      .select()
      .from(cliDeviceCodes)
      .where(
        and(
          eq(cliDeviceCodes.userCode, userCode),
          gt(cliDeviceCodes.expiresAt, now),
        ),
      )
      .limit(1);

    return rows[0] ? toEntry(rows[0]) : undefined;
  }

  async complete(userCode: string, token: string): Promise<boolean> {
    const now = new Date();
    const result = await db
      .update(cliDeviceCodes)
      .set({ token, status: 'complete' })
      .where(
        and(
          eq(cliDeviceCodes.userCode, userCode),
          gt(cliDeviceCodes.expiresAt, now),
        ),
      )
      .returning({ deviceCode: cliDeviceCodes.deviceCode });

    return result.length > 0;
  }

  async deny(userCode: string): Promise<boolean> {
    const now = new Date();
    const result = await db
      .update(cliDeviceCodes)
      .set({ status: 'denied' })
      .where(
        and(
          eq(cliDeviceCodes.userCode, userCode),
          gt(cliDeviceCodes.expiresAt, now),
        ),
      )
      .returning({ deviceCode: cliDeviceCodes.deviceCode });

    return result.length > 0;
  }

  async deleteByDeviceCode(deviceCode: string): Promise<void> {
    await db.delete(cliDeviceCodes).where(eq(cliDeviceCodes.deviceCode, deviceCode));
  }
}

function toEntry(row: typeof cliDeviceCodes.$inferSelect): CliDeviceEntry {
  return {
    deviceCode: row.deviceCode,
    userCode:   row.userCode,
    token:      row.token ?? undefined,
    status:     row.status as CliDeviceStatus,
    expiresAt:  row.expiresAt,
  };
}

export const cliDeviceStore: CliDeviceStore = new DbCliDeviceStore();
