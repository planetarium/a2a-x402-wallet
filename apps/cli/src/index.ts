#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('a2a-x402-wallet')
  .description('A2A x402 Wallet CLI')
  .version('0.1.0');

program.parse();
