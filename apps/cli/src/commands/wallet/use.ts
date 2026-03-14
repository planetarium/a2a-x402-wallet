import { Command } from 'commander';
import { LocalWalletProvider } from '../../wallet/local.js';
import { setDefaultWallet } from '../../store/config.js';

export function makeWalletUseCommand(): Command {
  return new Command('use')
    .description('Set the active wallet for signing')
    .argument('[name]', 'Local wallet name to set as active')
    .option('--custodial', 'Use the custodial (web) wallet instead of a local wallet')
    .action(async (name: string | undefined, opts: { custodial?: boolean }) => {
      if (opts.custodial) {
        setDefaultWallet({ type: 'custodial' });
        console.log('Active wallet set to custodial (web). Run `a2a-wallet wallet connect` if not already logged in.');
        return;
      }

      if (!name) {
        console.error('Error: Provide a wallet name, or use --custodial to select the custodial wallet.');
        process.exit(1);
      }

      try {
        const provider = new LocalWalletProvider();
        const wallets = await provider.list();
        const found = wallets.find((w) => w.name === name);
        if (!found) {
          console.error(`Error: Wallet "${name}" not found.`);
          process.exit(1);
        }

        setDefaultWallet({ type: 'local', name: found.name });
        console.log(`Active wallet set to "${found.name}" (${found.address}).`);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
