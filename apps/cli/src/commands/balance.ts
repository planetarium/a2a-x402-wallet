import { Command } from 'commander';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import type { Chain } from 'viem';
import { NETWORKS, USDC_DECIMALS } from '@a2a-x402-wallet/x402';
import { resolveSigner } from '../wallet/signer.js';

const NETWORK_CONFIG: Record<string, { chain: Chain; usdc: `0x${string}` }> = {
  'base':         { chain: base,        usdc: NETWORKS['base']['usdcAddress'] },
  'base-sepolia': { chain: baseSepolia, usdc: NETWORKS['base-sepolia']['usdcAddress'] },
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
    .description('Show USDC balance on a given network for the active wallet')
    .option('--network <network>', `Network to query (${Object.keys(NETWORK_CONFIG).join(', ')})`, 'base-sepolia')
    .option('--wallet <name>', 'Local wallet to query (overrides default wallet)')
    .option('--custodial', 'Use the custodial wallet (overrides default wallet)')
    .option('--token <jwt>', 'JWT for custodial wallet (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .option('--json', 'Output pure JSON to stdout')
    .action(async (opts: { network: string; wallet?: string; custodial?: boolean; token?: string; url?: string; json?: boolean }) => {
      const networkCfg = NETWORK_CONFIG[opts.network];
      if (!networkCfg) {
        console.error(`Error: Unsupported network "${opts.network}". Supported: ${Object.keys(NETWORK_CONFIG).join(', ')}`);
        process.exit(1);
      }

      try {
        const signer = await resolveSigner({ wallet: opts.wallet, custodial: opts.custodial, token: opts.token, url: opts.url });
        const address = await signer.getAddress();

        const client = createPublicClient({ chain: networkCfg.chain, transport: http() });
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
