import { eq, lt } from 'drizzle-orm';
import type { PaymentRequirements } from '@a2a-x402-wallet/x402';
import { db } from './db';
import { x402AcceptsConfigs, x402PendingTasks } from './schema';

const TASK_TTL_MS = 30 * 60 * 1000;

export const x402Store = {
  // ---------------------------------------------------------------------------
  // Accepts configs — the set of PaymentRequirements the merchant accepts.
  // ---------------------------------------------------------------------------

  /**
   * Returns the active accepts config from the DB, or null if none is set.
   * Callers should fall back to env vars when this returns null.
   */
  async getActiveAccepts(): Promise<PaymentRequirements[] | null> {
    const row = await db.query.x402AcceptsConfigs.findFirst({
      where: eq(x402AcceptsConfigs.isActive, true),
    });
    return row?.accepts ?? null;
  },

  /**
   * Upserts a named accepts config and optionally activates it.
   * If activate=true, all other configs are deactivated first.
   */
  async setAcceptsConfig(name: string, accepts: PaymentRequirements[], activate = true): Promise<void> {
    await db.transaction(async (tx) => {
      if (activate) {
        // Deactivate all existing active configs
        await tx
          .update(x402AcceptsConfigs)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(x402AcceptsConfigs.isActive, true));
      }

      await tx
        .insert(x402AcceptsConfigs)
        .values({ name, accepts, isActive: activate, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: x402AcceptsConfigs.name,
          set: { accepts, isActive: activate, updatedAt: new Date() },
        });
    });
  },

  // ---------------------------------------------------------------------------
  // Pending payment tasks — taskId → PaymentRequirements[], with TTL.
  // ---------------------------------------------------------------------------

  async setPendingTask(taskId: string, paymentRequirements: PaymentRequirements[]): Promise<void> {
    const expiresAt = new Date(Date.now() + TASK_TTL_MS);
    await db
      .insert(x402PendingTasks)
      .values({ taskId, paymentRequirements, expiresAt })
      .onConflictDoUpdate({
        target: x402PendingTasks.taskId,
        set: { paymentRequirements, expiresAt },
      });
  },

  async getPendingTask(taskId: string): Promise<PaymentRequirements[] | null> {
    const row = await db.query.x402PendingTasks.findFirst({
      where: eq(x402PendingTasks.taskId, taskId),
    });
    if (!row) return null;
    if (row.expiresAt < new Date()) {
      await db.delete(x402PendingTasks).where(eq(x402PendingTasks.taskId, taskId));
      return null;
    }
    return row.paymentRequirements;
  },

  async deletePendingTask(taskId: string): Promise<void> {
    await db.delete(x402PendingTasks).where(eq(x402PendingTasks.taskId, taskId));
  },

  /** Deletes all expired pending tasks. Call periodically to keep the table clean. */
  async evictStaleTasks(): Promise<void> {
    await db.delete(x402PendingTasks).where(lt(x402PendingTasks.expiresAt, new Date()));
  },
};
