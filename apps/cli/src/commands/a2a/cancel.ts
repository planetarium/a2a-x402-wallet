import { Command } from 'commander';
import { buildClientFactory, formatA2AError, resolveAgentCardArgs } from './client.js';
import { getConnection } from '../../store/config.js';

export function makeCancelCommand(): Command {
  return new Command('cancel')
    .description('Request cancellation of a running task.\nThe agent may or may not honor the request depending on its current state.')
    .argument('<url|agentCardUrl>', 'Agent base URL or agent card URL (e.g. from registry search)')
    .argument('<taskId>', 'Task ID to cancel')
    .option('--bearer <token>', 'Bearer token for agent authentication')
    .option('--json', 'Output raw JSON (single line)')
    .action(async (url: string, taskId: string, opts: { bearer?: string; json?: boolean }) => {
      const bearer = opts.bearer ?? getConnection(url)?.apiKey;
      const factory = buildClientFactory(bearer);
      try {
        const client = await factory.createFromUrl(...resolveAgentCardArgs(url));
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
