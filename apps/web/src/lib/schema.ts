import { pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const userPaymentLimits = pgTable(
  'user_payment_limits',
  {
    id:        serial('id').primaryKey(),
    userId:    text('user_id').notNull(),
    network:   text('network').notNull(),
    asset:     text('asset').notNull(),       // normalized to lowercase
    maxAmount: text('max_amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('user_network_asset_idx').on(t.userId, t.network, t.asset)],
);

// Stores short-lived nonces for the Device Code Flow (RFC 8628 style).
// Replaces the previous in-memory store to support horizontal scaling.
export const deviceNonces = pgTable('device_nonces', {
  nonce:     text('nonce').primaryKey(),
  // Populated by the /complete endpoint after the user authenticates.
  token:     text('token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Stores short-lived device codes for the A2A Device Code Flow.
// Temporary flow state — rows are deleted once the CLI consumes the api_key.
export const a2aDeviceCodes = pgTable('a2a_device_codes', {
  code:      text('code').primaryKey(),
  // Populated by /a2a/device/complete after the user authenticates in the browser.
  apiKey:    text('api_key'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Stores persistent API keys issued via the A2A Device Code Flow.
// Keyed on the api_key value itself for fast O(1) lookup.
export const a2aApiKeys = pgTable('a2a_api_keys', {
  apiKey:    text('api_key').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
