import { eq, and } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { getChainId } from '@a2a-x402-wallet/x402';
import { db } from '../db';
import { userPaymentLimits, userSettings } from '../schema';
import { mergeWithDefaults } from '../default-payment-limits';
import { builder } from './builder';
import { defaultExpirationTime } from '../jwt';

// ── UserSettings ──────────────────────────────────────────────────────────────

/** Format accepted for jwtExpiresIn: a positive integer followed by s/m/h/d. */
const JWT_EXPIRES_IN_RE = /^\d+[smhd]$/;

interface UserSettingsShape {
  jwtExpiresIn: string | null;
  jwtExpiresInDefault: string;
}

const UserSettings = builder.objectRef<UserSettingsShape>('UserSettings').implement({
  fields: (t) => ({
    // null means the server default (JWT_EXPIRATION_TIME env var) is in use
    jwtExpiresIn: t.exposeString('jwtExpiresIn', { nullable: true }),
    jwtExpiresInDefault: t.exposeString('jwtExpiresInDefault'),
  }),
});

// ── PaymentLimit ──────────────────────────────────────────────────────────────

interface PaymentLimitShape {
  network:   string;
  asset:     string;
  maxAmount: string;
  isDefault: boolean;
}

const PaymentLimit = builder.objectRef<PaymentLimitShape>('PaymentLimit').implement({
  fields: (t) => ({
    network:   t.exposeString('network'),
    asset:     t.exposeString('asset'),
    maxAmount: t.exposeString('maxAmount'),
    isDefault: t.exposeBoolean('isDefault'),
  }),
});

builder.queryType({
  fields: (t) => ({
    userSettings: t.field({
      type:     UserSettings,
      nullable: true,
      resolve:  async (_root, _args, ctx): Promise<UserSettingsShape> => {
        if (!ctx.userId) throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        const rows = await db
          .select({ jwtExpiresIn: userSettings.jwtExpiresIn })
          .from(userSettings)
          .where(eq(userSettings.userId, ctx.userId))
          .limit(1);
        // Return a shape with null jwtExpiresIn when the user has no saved setting
        return { jwtExpiresIn: rows[0]?.jwtExpiresIn ?? null, jwtExpiresInDefault: defaultExpirationTime };
      },
    }),

    paymentLimits: t.field({
      type:    [PaymentLimit],
      resolve: async (_root, _args, ctx) => {
        if (!ctx.userId) throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        const rows = await db
          .select({
            network:   userPaymentLimits.network,
            asset:     userPaymentLimits.asset,
            maxAmount: userPaymentLimits.maxAmount,
          })
          .from(userPaymentLimits)
          .where(eq(userPaymentLimits.userId, ctx.userId));
        return mergeWithDefaults(rows);
      },
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    setJwtExpiresIn: t.field({
      type: UserSettings,
      args: {
        // null clears the per-user override, reverting to the server default
        value: t.arg.string({ required: false }),
      },
      resolve: async (_root, args, ctx): Promise<UserSettingsShape> => {
        if (!ctx.userId) throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });

        const value = args.value ?? null;

        // Validate format when a value is provided: e.g. 5m, 1h, 24h, 7d
        if (value !== null && !JWT_EXPIRES_IN_RE.test(value)) {
          throw new GraphQLError(
            'Invalid jwtExpiresIn format. Use a positive integer followed by s, m, h, or d (e.g. 5m, 1h, 24h, 7d).',
            { extensions: { code: 'BAD_USER_INPUT' } },
          );
        }

        await db
          .insert(userSettings)
          .values({ userId: ctx.userId, jwtExpiresIn: value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set:    { jwtExpiresIn: value, updatedAt: new Date() },
          });

        return { jwtExpiresIn: value, jwtExpiresInDefault: defaultExpirationTime };
      },
    }),

    setPaymentLimit: t.field({
      type: PaymentLimit,
      args: {
        network:   t.arg.string({ required: true }),
        asset:     t.arg.string({ required: true }),
        maxAmount: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx): Promise<PaymentLimitShape> => {
        if (!ctx.userId) throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });

        // Validate network
        try {
          getChainId(args.network);
        } catch {
          throw new GraphQLError(`Invalid network: ${args.network}`, { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Validate asset: 0x + 40 hex chars
        if (!/^0x[0-9a-fA-F]{40}$/.test(args.asset)) {
          throw new GraphQLError('Invalid asset address', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Validate maxAmount: positive integer string
        if (!/^\d+$/.test(args.maxAmount) || BigInt(args.maxAmount) <= 0n) {
          throw new GraphQLError('maxAmount must be a positive integer string', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const network   = args.network.toLowerCase();
        const asset     = args.asset.toLowerCase();
        const maxAmount = args.maxAmount;

        await db
          .insert(userPaymentLimits)
          .values({ userId: ctx.userId, network, asset, maxAmount })
          .onConflictDoUpdate({
            target: [userPaymentLimits.userId, userPaymentLimits.network, userPaymentLimits.asset],
            set:    { maxAmount, updatedAt: new Date() },
          });

        return { network, asset, maxAmount, isDefault: false };
      },
    }),

    deletePaymentLimit: t.field({
      type: 'Boolean',
      args: {
        network: t.arg.string({ required: true }),
        asset:   t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        if (!ctx.userId) throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });

        const network = args.network.toLowerCase();
        const asset   = args.asset.toLowerCase();

        await db
          .delete(userPaymentLimits)
          .where(
            and(
              eq(userPaymentLimits.userId, ctx.userId),
              eq(userPaymentLimits.network, network),
              eq(userPaymentLimits.asset, asset),
            ),
          );

        return true;
      },
    }),
  }),
});

export const schema = builder.toSchema();
