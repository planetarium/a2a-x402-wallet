import { Command } from 'commander';
import { getEffectiveConfig } from '../config.js';
import { callWhoami } from '../api.js';

export function makeWhoamiCommand(): Command {
  return new Command('whoami')
    .description('Show authenticated user info from the configured token')
    .option('--token <jwt>', 'JWT for this request only (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .option('--json', 'Output pure JSON to stdout')
    .action(async (opts: { token?: string; url?: string; json?: boolean }) => {
      const cfg = getEffectiveConfig({ token: opts.token, url: opts.url });

      if (!cfg.token) {
        console.error('Error: Not logged in. Run:');
        console.error('  a2a-wallet auth login                  (interactive / human)');
        console.error('  a2a-wallet auth device start           (agent / headless — step 1)');
        console.error('  a2a-wallet auth device poll --nonce …  (agent / headless — step 2)');
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
        if (opts.json) {
          process.stdout.write(JSON.stringify({ id: user.id, wallet: wallet?.address ?? null }));
        } else {
          console.log(`User ID: ${user.id}`);
          console.log(`Wallet:  ${wallet?.address ?? '(none)'}`);
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
