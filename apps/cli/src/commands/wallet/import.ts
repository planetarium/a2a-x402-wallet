import { Command } from 'commander';
import { LocalWalletProvider } from '../../wallet/local.js';
import { readConfig, setDefaultWallet } from '../../store/config.js';
import { resolveWalletNameToCreate } from '../../wallet/name.js';

export function makeWalletImportCommand(): Command {
  return new Command('import')
    .description('Import a wallet from a private key')
    .argument('[name]', 'Wallet name (auto-generated if omitted)')
    .requiredOption('--private-key <key>', 'Hex private key (with or without 0x prefix)')
    .action(async (nameArg: string | undefined, opts: { privateKey: string }) => {
      const provider = new LocalWalletProvider();
      try {
        const name = resolveWalletNameToCreate(nameArg);
        const wallet = await provider.importFromPrivateKey(name, opts.privateKey);

        const config = readConfig();
        if (!config.defaultWallet) {
          setDefaultWallet({ type: 'local', name: wallet.name });
          console.log('Wallet imported successfully. (set as default)');
        } else {
          console.log('Wallet imported successfully.');
        }
        console.log(`  Name:    ${wallet.name}`);
        console.log(`  Address: ${wallet.address}`);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
