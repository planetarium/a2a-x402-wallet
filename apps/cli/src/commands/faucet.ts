import { Command } from 'commander';
import { getEffectiveConfig } from '../store/config.js';
import { tryOpenBrowser } from '../utils.js';

export function makeFaucetCommand(): Command {
  return new Command('faucet')
    .description('Get testnet USDC (Base Sepolia) via the web faucet')
    .option('--url <url>', 'Web app URL (overrides config)')
    .action((opts: { url?: string }) => {
      const cfg = getEffectiveConfig({ url: opts.url });
      const faucetUrl = `${cfg.url}/settings`;

      tryOpenBrowser(faucetUrl);

      console.log('To receive testnet USDC (Base Sepolia), visit the following URL:');
      console.log('');
      console.log(`  ${faucetUrl}`);
      console.log('');
      console.log('Sign in with Privy and click "Request 1 Testnet USDC (Base Sepolia)".');
      console.log('Your balance must be below 0.1 USDC to be eligible.');
    });
}
