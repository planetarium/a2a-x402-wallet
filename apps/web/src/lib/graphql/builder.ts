import SchemaBuilder from '@pothos/core';

export interface Context {
  userId: string | null;
  walletId: string | null;
}

export const builder = new SchemaBuilder<{ Context: Context }>({});
