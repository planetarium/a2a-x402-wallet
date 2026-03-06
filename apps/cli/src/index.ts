#!/usr/bin/env node

import { Command } from 'commander';
import { makeAuthCommand } from './commands/auth.js';
import { makeConfigCommand } from './commands/config.js';
import { makeSignCommand } from './commands/sign.js';
import { makeX402Command } from './commands/x402.js';
import { makeWhoamiCommand } from './commands/whoami.js';
import { makeUpdateCommand } from './commands/update.js';
import { makeA2ACommand } from './commands/a2a.js';
import pkg from '../package.json' with { type: 'json' };

const program = new Command()
  .name('a2a-wallet')
  .description('CLI for signing x402 payment payloads via a2a-wallet')
  .version(pkg.version);

program.addCommand(makeAuthCommand());
program.addCommand(makeConfigCommand());
program.addCommand(makeSignCommand());
program.addCommand(makeX402Command());
program.addCommand(makeWhoamiCommand());
program.addCommand(makeUpdateCommand());
program.addCommand(makeA2ACommand());

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
