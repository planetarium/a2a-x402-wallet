import { eq, and } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { getChainId } from '@a2a-x402-wallet/x402';
import { db } from '../db';
import { userPaymentLimits } from '../schema';
import { mergeWithDefaults } from '../default-payment-limits';
import { builder } from './builder';

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
