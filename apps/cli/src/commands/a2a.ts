import { Command } from 'commander';
import { makeCardCommand } from './a2a/card.js';
import { makeSendCommand } from './a2a/send.js';
import { makeStreamCommand } from './a2a/stream.js';
import { makeTasksCommand } from './a2a/tasks.js';
import { makeCancelCommand } from './a2a/cancel.js';
import { makeAuthCommand } from './a2a/auth.js';
import { makeListCommand } from './a2a/list.js';
import { makeDisconnectCommand } from './a2a/disconnect.js';
import { makeSearchCommand } from './a2a/search.js';

export function makeA2ACommand(): Command {
  const cmd = new Command('a2a').description('A2A (Agent2Agent) protocol client commands (auth, list, disconnect, card, send, stream, tasks, cancel, search)');

  cmd.addCommand(makeAuthCommand());
  cmd.addCommand(makeListCommand());
  cmd.addCommand(makeDisconnectCommand());
  cmd.addCommand(makeCardCommand());
  cmd.addCommand(makeSendCommand());
  cmd.addCommand(makeStreamCommand());
  cmd.addCommand(makeTasksCommand());
  cmd.addCommand(makeCancelCommand());
  cmd.addCommand(makeSearchCommand());

  return cmd;
}
