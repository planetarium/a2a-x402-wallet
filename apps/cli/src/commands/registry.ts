import { Command } from 'commander';
import { makeSearchCommand } from './registry/search.js';
import { makeRegisterCommand } from './registry/register.js';

export function makeRegistryCommand(): Command {
  const cmd = new Command('registry').description('Agent registry commands (search, register)');

  cmd.addCommand(makeSearchCommand());
  cmd.addCommand(makeRegisterCommand());

  return cmd;
}
