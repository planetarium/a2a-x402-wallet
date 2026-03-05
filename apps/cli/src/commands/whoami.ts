import { Command } from 'commander';
import { getEffectiveConfig } from '../config.js';
import { callWhoami } from '../api.js';

export function makeWhoamiCommand(): Command {
  return new Command('whoami')
    .description('Show authenticated user info from the configured token')
    .option('--token <jwt>', 'JWT for this request only (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .action(async (opts: { token?: string; url?: string }) => {
      const cfg = getEffectiveConfig({ token: opts.token, url: opts.url });

      if (!cfg.token) {
        console.error('Error: No token configured. Run: a2a-wallet config set token <your-jwt>');
        process.exit(1);
      }

      try {
        const data = await callWhoami(cfg.url, cfg.token) as {
          user: { id: string; linkedAccounts?: Array<{ type: string; address?: string }> };
        };
        const { user } = data;
        const wallet = user.linkedAccounts?.find(
          (a) => (a.type === 'wallet' || a.type === 'ethereum_wallet') && a.address,
        );
        console.log(`User ID: ${user.id}`);
        console.log(`Wallet:  ${wallet?.address ?? '(none)'}`);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
