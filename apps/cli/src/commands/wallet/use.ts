import { Command } from 'commander';
import { LocalWalletProvider } from '../../wallet/local.js';
import { readConfig, writeConfig } from '../../store/config.js';

export function makeWalletUseCommand(): Command {
  return new Command('use')
    .description('Set the default wallet')
    .argument('<name>', 'Wallet name to set as default')
    .action(async (name: string) => {
      const provider = new LocalWalletProvider();
      try {
        const wallets = await provider.list();
        const found = wallets.find((w) => w.name === name);
        if (!found) {
          console.error(`Error: Wallet "${name}" not found.`);
          process.exit(1);
        }

        const config = readConfig();
        writeConfig({ ...config, defaultWallet: name });
        console.log(`Default wallet set to "${found.name}" (${found.address}).`);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
