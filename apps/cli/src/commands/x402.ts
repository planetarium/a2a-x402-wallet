import { Command } from 'commander';
import type { PaymentRequirements } from '@a2a-x402-wallet/x402';
import { resolveSigner } from '../wallet/signer.js';

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
    .requiredOption('--extra-name <name>', 'EIP-712 domain name from token contract (e.g. "USDC")')
    .requiredOption('--extra-version <version>', 'EIP-712 domain version from token contract (e.g. "2")')
    .option('--valid-for <seconds>', 'Signature validity window in seconds (sets maxTimeoutSeconds)', '3600')
    .option('--wallet <name>', 'Local wallet to sign with (overrides default wallet)')
    .option('--custodial', 'Use the custodial wallet (overrides default wallet)')
    .option('--token <jwt>', 'JWT for custodial signing (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .option('--json', 'Output pure JSON to stdout (recommended for Agent/MCP use)')
    .action(async (opts: {
      scheme: string;
      network: string;
      asset: string;
      payTo: string;
      amount: string;
      extraName: string;
      extraVersion: string;
      validFor: string;
      wallet?: string;
      custodial?: boolean;
      token?: string;
      url?: string;
      json?: boolean;
    }) => {
      const maxTimeoutSeconds = parseInt(opts.validFor, 10);
      if (isNaN(maxTimeoutSeconds) || maxTimeoutSeconds <= 0) {
        console.error('Error: --valid-for must be a positive integer (seconds)');
        process.exit(1);
      }

      try {
        const signer = await resolveSigner({ wallet: opts.wallet, custodial: opts.custodial, token: opts.token, url: opts.url });

        const requirements: PaymentRequirements = {
          scheme: opts.scheme,
          network: opts.network,
          asset: opts.asset as `0x${string}`,
          payTo: opts.payTo as `0x${string}`,
          maxAmountRequired: opts.amount,
          maxTimeoutSeconds,
          extra: { name: opts.extraName, version: opts.extraVersion },
        };

        const payload = await signer.signX402Payment(requirements);
        const metadata = {
          'x402.payment.status': 'payment-submitted',
          'x402.payment.payload': payload,
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
