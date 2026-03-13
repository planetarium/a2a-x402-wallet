import { Command } from 'commander';
import { KEY_FILE, WALLET_FILE } from '../../store/wallet.js';

export function makeWalletExportCommand(): Command {
  return new Command('export')
    .description('Show instructions for moving wallets to another machine')
    .action(() => {
      console.log('Wallet export is not supported for security reasons.');
      console.log('');
      console.log('To move your wallets to another machine, manually copy the following files:');
      console.log('');
      console.log(`  ${WALLET_FILE}`);
      console.log(`  ${KEY_FILE}`);
      console.log('');
      console.log('Keep these files secure. Anyone with access to both files can access your wallets.');
    });
}
