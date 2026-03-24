import { Command } from 'commander';
import { getEffectiveConfig } from '../store/config.js';
import { resolveSigner } from '../wallet/signer.js';
import { callFaucet } from '../api/custody-wallet.js';

export function makeFaucetCommand(): Command {
  return new Command('faucet')
    .description('Request testnet USDC (Base Sepolia) from the faucet')
    .option('--wallet <name>', 'Local wallet to use (overrides default wallet)')
    .option('--custodial', 'Use the custodial wallet (overrides default wallet)')
    .option('--token <jwt>', 'JWT for custodial wallet (overrides config)')
    .option('--url <url>', 'Web app URL (overrides config)')
    .option('--address <address>', 'Recipient address (overrides wallet address)')
    .option('--json', 'Output pure JSON to stdout')
    .action(async (opts: { wallet?: string; custodial?: boolean; token?: string; url?: string; address?: string; json?: boolean }) => {
      const cfg = getEffectiveConfig({ url: opts.url, token: opts.token });

      let address: string;
      if (opts.address) {
        address = opts.address;
      } else {
        try {
          const signer = await resolveSigner({ wallet: opts.wallet, custodial: opts.custodial, token: opts.token, url: opts.url });
          address = await signer.getAddress();
        } catch (err) {
          console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }
      }

      if (!opts.json) {
        console.log(`Requesting faucet for ${address}...`);
      }

      try {
        const result = await callFaucet(cfg.url, address) as {
          success: boolean;
          transaction: string;
          network: string;
          recipient: string;
          amount: string;
          payer?: string;
        };

        if (opts.json) {
          console.log(JSON.stringify(result));
        } else {
          console.log(`Success! ${result.amount} USDC sent to ${result.recipient}`);
          console.log(`Network:     ${result.network}`);
          console.log(`Transaction: ${result.transaction}`);
        }
      } catch (err) {
        if (opts.json) {
          console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        } else {
          console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
        process.exit(1);
      }
    });
}
