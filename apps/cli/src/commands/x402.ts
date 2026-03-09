import { Command } from 'commander';
import { getEffectiveConfig } from '../config.js';
import { callX402Sign, exitNotLoggedIn } from '../api.js';

export function makeX402Command(): Command {
  const cmd = new Command('x402').description('x402 payment protocol commands (sign)');

  cmd
    .command('sign')
    .description(
      'Sign x402 PaymentRequirements and output a ready-to-use A2A message.metadata object.\n\n' +
      'The output is a JSON object with two keys:\n' +
      '  "x402.payment.status": "payment-submitted"\n' +
      '  "x402.payment.payload": <signed PaymentPayload>\n\n' +
      'When sending an A2A message to submit payment, set message.metadata to this object:\n' +
      '  { "taskId": "<task-id>", "role": "user", "parts": [...], "metadata": <this output> }'
    )
    .requiredOption('--scheme <scheme>', 'Payment scheme (currently only "exact" is supported)')
    .requiredOption('--network <network>', 'Blockchain network (e.g. base, base-sepolia)')
    .requiredOption('--asset <address>', 'ERC-20 token contract address')
    .requiredOption('--pay-to <address>', 'Merchant wallet address')
    .requiredOption('--amount <value>', 'Max payment amount in token smallest unit (e.g. 120000000 for 120 USDC)')
    .option('--valid-for <seconds>', 'Signature validity window in seconds (sets maxTimeoutSeconds)', '3600')
    .option('--extra-name <name>', 'EIP-712 domain name from token contract (e.g. "USDC")')
    .option('--extra-version <version>', 'EIP-712 domain version from token contract (e.g. "2")')
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
      extraName?: string;
      extraVersion?: string;
      token?: string;
      url?: string;
      json?: boolean;
    }) => {
      const cfg = getEffectiveConfig({ token: opts.token, url: opts.url });

      if (!cfg.token) exitNotLoggedIn();

      const maxTimeoutSeconds = parseInt(opts.validFor, 10);
      if (isNaN(maxTimeoutSeconds) || maxTimeoutSeconds <= 0) {
        console.error('Error: --valid-for must be a positive integer (seconds)');
        process.exit(1);
      }

      const extra: Record<string, unknown> | undefined =
        opts.extraName || opts.extraVersion
          ? { name: opts.extraName, version: opts.extraVersion }
          : undefined;

      try {
        const result = await callX402Sign(cfg.url, cfg.token, {
          paymentRequirements: {
            scheme: opts.scheme,
            network: opts.network,
            asset: opts.asset,
            payTo: opts.payTo,
            maxAmountRequired: opts.amount,
            maxTimeoutSeconds,
            ...(extra && { extra }),
          },
        });

        const metadata = {
          'x402.payment.status': 'payment-submitted',
          'x402.payment.payload': result,
        };

        if (opts.json) {
          console.log(JSON.stringify(metadata));
        } else {
          console.log(JSON.stringify(metadata, null, 2));
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  return cmd;
}
