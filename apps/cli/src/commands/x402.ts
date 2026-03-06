import { Command } from 'commander';
import { getEffectiveConfig } from '../config.js';
import { callX402Sign, exitNotLoggedIn } from '../api.js';

export function makeX402Command(): Command {
  const cmd = new Command('x402').description('x402 payment protocol commands');

  cmd
    .command('sign')
    .description('Sign x402 PaymentRequirements and output a PaymentPayload')
    .requiredOption('--scheme <scheme>', 'Payment scheme (currently only "exact" is supported)')
    .requiredOption('--network <network>', 'Blockchain network (e.g. base, base-sepolia)')
    .requiredOption('--asset <address>', 'ERC-20 token contract address')
    .requiredOption('--pay-to <address>', 'Merchant wallet address')
    .requiredOption('--amount <value>', 'Max payment amount in token smallest unit (e.g. 120000000 for 120 USDC)')
    .option('--valid-for <seconds>', 'Signature validity in seconds', '3600')
    .option('--token <jwt>', 'JWT for this request only (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .option('--json', 'Output pure JSON to stdout (recommended for Agent/MCP use)')
    .action(async (opts: {
      scheme: string;
      network: string;
      asset: string;
      payTo: string;
      amount: string;
      validFor: string;
      token?: string;
      url?: string;
      json?: boolean;
    }) => {
      const cfg = getEffectiveConfig({ token: opts.token, url: opts.url });

      if (!cfg.token) exitNotLoggedIn();

      const validForSeconds = parseInt(opts.validFor, 10);
      if (isNaN(validForSeconds) || validForSeconds <= 0) {
        console.error('Error: --valid-for must be a positive integer (seconds)');
        process.exit(1);
      }

      try {
        const result = await callX402Sign(cfg.url, cfg.token, {
          paymentRequirements: {
            scheme: opts.scheme,
            network: opts.network,
            asset: opts.asset,
            payTo: opts.payTo,
            maxAmountRequired: opts.amount,
          },
          validForSeconds,
        });

        if (opts.json) {
          console.log(JSON.stringify(result));
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  return cmd;
}
