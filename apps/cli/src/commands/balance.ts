import { Command } from 'commander';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, baseSepolia, mainnet, optimism, arbitrum } from 'viem/chains';
import type { Chain } from 'viem';
import { getEffectiveConfig } from '../config.js';
import { callWhoami, exitNotLoggedIn } from '../api.js';

const USDC_DECIMALS = 6;

const NETWORK_CONFIG: Record<string, { chain: Chain; usdc: `0x${string}` }> = {
  'base':         { chain: base,       usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  'base-sepolia': { chain: baseSepolia, usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' },
  'ethereum':     { chain: mainnet,    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  'optimism':     { chain: optimism,   usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  'arbitrum':     { chain: arbitrum,   usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
};

const ERC20_BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export function makeBalanceCommand(): Command {
  return new Command('balance')
    .description('Show USDC balance on a given network for the logged-in wallet')
    .option('--network <network>', `Network to query (${Object.keys(NETWORK_CONFIG).join(', ')})`, 'base-sepolia')
    .option('--token <jwt>', 'JWT for this request only (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .option('--json', 'Output pure JSON to stdout')
    .action(async (opts: { network: string; token?: string; url?: string; json?: boolean }) => {
      const cfg = getEffectiveConfig({ token: opts.token, url: opts.url });

      if (!cfg.token) exitNotLoggedIn();

      const networkCfg = NETWORK_CONFIG[opts.network];
      if (!networkCfg) {
        console.error(`Error: Unsupported network "${opts.network}". Supported: ${Object.keys(NETWORK_CONFIG).join(', ')}`);
        process.exit(1);
      }

      try {
        const data = await callWhoami(cfg.url, cfg.token) as {
          user: { linkedAccounts?: Array<{ type: string; address?: string }> };
        };
        const wallet = data.user.linkedAccounts?.find(
          (a) => (a.type === 'wallet' || a.type === 'ethereum_wallet') && a.address,
        );
        if (!wallet?.address) {
          throw new Error('No wallet address found for this account');
        }

        const address = wallet.address as `0x${string}`;
        const client = createPublicClient({
          chain: networkCfg.chain,
          transport: http(),
        });

        const raw = await client.readContract({
          address: networkCfg.usdc,
          abi: ERC20_BALANCE_OF_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        const formatted = formatUnits(raw, USDC_DECIMALS);

        if (opts.json) {
          console.log(JSON.stringify({ address, network: opts.network, token: 'USDC', balance: formatted }));
        } else {
          console.log(`Wallet:  ${address}`);
          console.log(`Network: ${opts.network}`);
          console.log(`Balance: ${formatted} USDC`);
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
