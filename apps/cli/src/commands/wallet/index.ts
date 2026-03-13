import { Command } from 'commander';
import { makeWalletCreateCommand } from './create.js';
import { makeWalletImportCommand } from './import.js';
import { makeWalletListCommand } from './list.js';
import { makeWalletUseCommand } from './use.js';
import { makeWalletExportCommand } from './export.js';

export function makeWalletCommand(): Command {
  const cmd = new Command('wallet').description(
    'Manage local Ethereum wallets — create, import, list, use, export',
  );

  cmd.addCommand(makeWalletCreateCommand());
  cmd.addCommand(makeWalletImportCommand());
  cmd.addCommand(makeWalletListCommand());
  cmd.addCommand(makeWalletUseCommand());
  cmd.addCommand(makeWalletExportCommand());

  return cmd;
}
