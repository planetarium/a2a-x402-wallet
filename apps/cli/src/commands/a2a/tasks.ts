import { Command } from 'commander';
import { buildClientFactory, formatA2AError } from './client.js';

function makeTasksGetCommand(): Command {
  return new Command('get')
    .description('Get the current state of a task (tasks/get)')
    .argument('<url>', 'Agent base URL (e.g. https://my-agent.example.com)')
    .argument('<taskId>', 'Task ID to retrieve')
    .option('--history <n>', 'Include last N messages from task history', '0')
    .option('--bearer <token>', 'Bearer token for agent authentication')
    .option('--json', 'Output raw JSON (single line)')
    .action(async (url: string, taskId: string, opts: { history: string; bearer?: string; json?: boolean }) => {
      const factory = buildClientFactory(opts.bearer);
      try {
        const client = await factory.createFromUrl(url);
        const task = await client.getTask({
          id: taskId,
          historyLength: parseInt(opts.history, 10),
        });

        if (opts.json) {
          console.log(JSON.stringify(task));
        } else {
          console.log(JSON.stringify(task, null, 2));
        }
      } catch (err) {
        console.error(`Error: ${formatA2AError(err)}`);
        process.exit(1);
      }
    });
}

export function makeTasksCommand(): Command {
  const cmd = new Command('tasks').description('A2A tasks commands');

  cmd.addCommand(makeTasksGetCommand());

  return cmd;
}
