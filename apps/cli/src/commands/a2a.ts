import { Command } from 'commander';
import { makeCardCommand } from './a2a/card.js';
import { makeSendCommand } from './a2a/send.js';
import { makeStreamCommand } from './a2a/stream.js';
import { makeTaskCommand } from './a2a/task.js';
import { makeTasksCommand } from './a2a/tasks.js';
import { makeCancelCommand } from './a2a/cancel.js';

export function makeA2ACommand(): Command {
  const cmd = new Command('a2a').description('A2A (Agent2Agent) protocol client commands');

  cmd.addCommand(makeCardCommand());
  cmd.addCommand(makeSendCommand());
  cmd.addCommand(makeStreamCommand());
  cmd.addCommand(makeTaskCommand());
  cmd.addCommand(makeTasksCommand());
  cmd.addCommand(makeCancelCommand());

  return cmd;
}
