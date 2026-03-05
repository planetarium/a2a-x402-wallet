import { Command } from 'commander';
import { getEffectiveConfig } from '../config.js';
import { callSign } from '../api.js';

export function makeSignCommand(): Command {
  return new Command('sign')
    .description('Sign an arbitrary message with your wallet')
    .requiredOption('--message <string>', 'Message to sign')
    .option('--token <jwt>', 'JWT for this request only (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .option('--json', 'Output pure JSON to stdout')
    .action(async (opts: {
      message: string;
      token?: string;
      url?: string;
      json?: boolean;
    }) => {
      const cfg = getEffectiveConfig({ token: opts.token, url: opts.url });

      if (!cfg.token) {
        console.error('Error: Not logged in. Run: a2a-wallet auth login');
        process.exit(1);
      }

      try {
        const result = await callSign(cfg.url, cfg.token, opts.message);

        if (opts.json) {
          process.stdout.write(JSON.stringify(result));
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
