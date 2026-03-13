#!/usr/bin/env node

import { Command } from 'commander';
import { makeAuthCommand } from './commands/auth.js';
import { makeConfigCommand } from './commands/config.js';
import { makeX402Command } from './commands/x402.js';
import { makeWhoamiCommand } from './commands/whoami.js';
import { makeUpdateCommand } from './commands/update.js';
import { makeA2ACommand } from './commands/a2a.js';
import { makeSiweCommand } from './commands/siwe/index.js';
import { makeBalanceCommand } from './commands/balance.js';
import { makeFaucetCommand } from './commands/faucet.js';
import { makeWalletCommand } from './commands/wallet/index.js';
import pkg from '../package.json' with { type: 'json' };

const program = new Command()
  .name('a2a-wallet')
  .description('CLI for signing x402 payment payloads via a2a-wallet')
  .version(pkg.version);

program.addCommand(makeA2ACommand());
program.addCommand(makeX402Command());
program.addCommand(makeAuthCommand());
program.addCommand(makeSiweCommand());
program.addCommand(makeConfigCommand());
program.addCommand(makeWhoamiCommand());
program.addCommand(makeBalanceCommand());
program.addCommand(makeFaucetCommand());
program.addCommand(makeWalletCommand());
program.addCommand(makeUpdateCommand());

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
