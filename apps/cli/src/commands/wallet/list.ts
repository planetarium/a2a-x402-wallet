import { Command } from 'commander';
import { LocalWalletProvider } from '../../wallet/local.js';
import { readConfig } from '../../store/config.js';
import { formatDateTime } from '../../utils.js';

export function makeWalletListCommand(): Command {
  return new Command('list')
    .description('List all saved local wallets')
    .option('--json', 'Output as JSON')
    .action(async (opts: { json?: boolean }) => {
      const provider = new LocalWalletProvider();
      try {
        const wallets = await provider.list();
        const defaultWallet = readConfig().defaultWallet;
        const isDefaultLocal = (name: string) =>
          defaultWallet?.type === 'local' && defaultWallet.name === name;

        if (opts.json) {
          const output = wallets.map((w) => ({
            name: w.name,
            address: w.address,
            type: w.type,
            ...(w.derivationPath ? { derivationPath: w.derivationPath } : {}),
            default: isDefaultLocal(w.name),
            createdAt: w.createdAt,
          }));
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        if (wallets.length === 0) {
          console.log('No wallets found. Run "a2a-wallet wallet create" to get started.');
          return;
        }

        const nameWidth = Math.max(4, ...wallets.map((w) => w.name.length));
        const addrWidth = 42;
        const typeWidth = 11; // 'private-key' length
        const header =
          '  ' +
          'NAME'.padEnd(nameWidth) +
          '  ' +
          'ADDRESS'.padEnd(addrWidth) +
          '  ' +
          'TYPE'.padEnd(typeWidth) +
          '  ' +
          'CREATED AT';
        console.log(header);

        for (const w of wallets) {
          const isDefault = isDefaultLocal(w.name) ? '*' : ' ';
          const suffix = w.type === 'mnemonic' && w.derivationPath ? `  (${w.derivationPath})` : '';
          console.log(
            `${isDefault} ${w.name.padEnd(nameWidth)}  ${w.address.padEnd(addrWidth)}  ${w.type.padEnd(typeWidth)}  ${formatDateTime(w.createdAt)}${suffix}`,
          );
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
