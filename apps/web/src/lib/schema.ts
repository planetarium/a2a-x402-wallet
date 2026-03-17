import { boolean, json, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';
import type { PaymentRequirements } from '@a2a-x402-wallet/x402';

// Per-user settings persisted in the database.
// jwtExpiresIn: null means fall back to the JWT_EXPIRATION_TIME env var.
export const userSettings = pgTable('user_settings', {
  id:           serial('id').primaryKey(),
  userId:       text('user_id').notNull().unique(),
  jwtExpiresIn: text('jwt_expires_in'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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

// Stores short-lived device codes for the A2A Device Code Flow (RFC 8628).
// Temporary flow state — rows are deleted once the CLI consumes the access_token.
export const a2aDeviceCodes = pgTable('a2a_device_codes', {
  code:      text('code').primaryKey(),
  // Human-readable code shown to the user (e.g. "WDJB-MJHT").
  userCode:  text('user_code'),
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

// Stores named sets of x402 PaymentRequirements (the accepts array).
// The active config (is_active = true) is used by the A2A route handler.
// Falls back to legacy env vars (A2A_X402_ACCEPTS, A2A_X402_PAY_TO, etc.) if no active row exists.
export const x402AcceptsConfigs = pgTable('x402_accepts_configs', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull().unique(),
  accepts:   json('accepts').notNull().$type<PaymentRequirements[]>(),
  isActive:  boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Stores pending x402 payment tasks by taskId.
// Replaces the previous in-memory Map to support horizontal scaling.
export const x402PendingTasks = pgTable('x402_pending_tasks', {
  taskId:              text('task_id').primaryKey(),
  paymentRequirements: json('payment_requirements').notNull().$type<PaymentRequirements[]>(),
  expiresAt:           timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Stores short-lived device codes for the RFC 8628-compliant CLI Device Authorization Flow.
// device_code is the secret polled by the CLI; user_code is the short human-readable code
// shown to the user. Rows are deleted once the CLI consumes the access_token.
export const cliDeviceCodes = pgTable('cli_device_codes', {
  deviceCode: text('device_code').primaryKey(),
  userCode:   text('user_code').notNull().unique(),
  // Populated by /api/device/complete after the user authenticates in the browser.
  token:      text('token'),
  // 'pending' | 'complete' | 'denied'
  status:     text('status').notNull().default('pending'),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
