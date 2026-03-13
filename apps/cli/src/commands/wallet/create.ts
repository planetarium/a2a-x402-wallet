import { Command } from 'commander';
import { LocalWalletProvider } from '../../wallet/local.js';
import { readConfig, writeConfig } from '../../store/config.js';
import { resolveWalletNameToCreate } from '../../wallet/name.js';

export function makeWalletCreateCommand(): Command {
  return new Command('create')
    .description('Create a new local Ethereum wallet (mnemonic-based)')
    .argument('[name]', 'Wallet name (auto-generated if omitted)')
    .option(
      '--path <derivation-path>',
      "BIP-44 derivation path (overrides auto-detection, e.g. m/44'/60'/0'/0/2)",
    )
    .action(async (nameArg: string | undefined, opts: { path?: string }) => {
      const provider = new LocalWalletProvider();
      try {
        const name = resolveWalletNameToCreate(nameArg);
        const wallet = await provider.create(name, opts.path);

        const config = readConfig();
        if (!config.defaultWallet) {
          writeConfig({ ...config, defaultWallet: wallet.name });
          console.log('Wallet created successfully. (set as default)');
        } else {
          console.log('Wallet created successfully.');
        }
        console.log(`  Name:    ${wallet.name}`);
        console.log(`  Address: ${wallet.address}`);
        console.log(`  Path:    ${wallet.derivationPath}`);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
