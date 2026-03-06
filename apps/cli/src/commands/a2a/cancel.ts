import { Command } from 'commander';
import { buildClientFactory, formatA2AError } from './client.js';

export function makeCancelCommand(): Command {
  return new Command('cancel')
    .description('Request cancellation of a running task')
    .argument('<url>', 'Agent base URL (e.g. https://my-agent.example.com)')
    .argument('<taskId>', 'Task ID to cancel')
    .option('--bearer <token>', 'Bearer token for agent authentication')
    .option('--json', 'Output raw JSON (single line)')
    .action(async (url: string, taskId: string, opts: { bearer?: string; json?: boolean }) => {
      const factory = buildClientFactory(opts.bearer);
      try {
        const client = await factory.createFromUrl(url);
        const task = await client.cancelTask({ id: taskId });

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
