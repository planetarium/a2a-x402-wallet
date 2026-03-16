import { Command } from 'commander';
import { readConfig, writeConfig } from '../../store/config.js';

export function makeWalletDisconnectCommand(): Command {
  return new Command('disconnect')
    .description('Log out of the custodial wallet service and remove the saved token')
    .action(() => {
      const existing = readConfig();
      if (!existing.token) {
        console.log('Not logged in to the custodial wallet service.');
        return;
      }
      writeConfig({ ...existing, token: undefined });
      console.log('Logged out. Custodial wallet disconnected.');

      if (existing.defaultWallet?.type === 'custodial') {
        writeConfig({ ...existing, token: undefined, defaultWallet: undefined });
        console.log('Active wallet has been unset. Use `wallet use <name>` to set a local wallet.');
      }
    });
}
