import { Command } from 'commander';
import { buildClientFactory, formatA2AError } from './client.js';
import { getConnection } from '../../store/config.js';

function makeTasksGetCommand(): Command {
  return new Command('get')
    .description('Fetch the current state and message history of a task by ID.\nUseful for checking the result of a previous send or monitoring an in-progress task.')
    .argument('<url>', 'Agent base URL (e.g. https://my-agent.example.com)')
    .argument('<taskId>', 'Task ID to retrieve')
    .option('--history <n>', 'Include last N messages from task history', '0')
    .option('--bearer <token>', 'Bearer token for agent authentication')
    .option('--json', 'Output raw JSON (single line)')
    .action(async (url: string, taskId: string, opts: { history: string; bearer?: string; json?: boolean }) => {
      const bearer = opts.bearer ?? getConnection(url)?.apiKey;
      const factory = buildClientFactory(bearer);
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
  const cmd = new Command('tasks').description('Query and manage A2A tasks (get)');

  cmd.addCommand(makeTasksGetCommand());

  return cmd;
}
