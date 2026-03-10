import { pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const userPaymentLimits = pgTable(
  'user_payment_limits',
  {
    id:        serial('id').primaryKey(),
    userId:    text('user_id').notNull(),
    network:   text('network').notNull(),
    asset:     text('asset').notNull(),       // 소문자로 정규화
    maxAmount: text('max_amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('user_network_asset_idx').on(t.userId, t.network, t.asset)],
);
