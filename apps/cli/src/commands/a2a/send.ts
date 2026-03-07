import { Command } from 'commander';
import { randomUUID } from 'crypto';
import { buildClientFactory, formatA2AError } from './client.js';

export function makeSendCommand(): Command {
  return new Command('send')
    .description('Send a message to an agent and print the response')
    .argument('<url>', 'Agent base URL (e.g. https://my-agent.example.com)')
    .argument('<message>', 'Text message to send')
    .option('--context-id <id>', 'Continue an existing conversation context')
    .option('--bearer <token>', 'Bearer token for agent authentication')
    .option('--json', 'Output raw JSON (single line)')
    .action(async (url: string, message: string, opts: { contextId?: string; bearer?: string; json?: boolean }) => {
      const factory = buildClientFactory(opts.bearer);
      try {
        const client = await factory.createFromUrl(url);
        const response = await client.sendMessage({
          message: {
            kind: 'message',
            messageId: randomUUID(),
            role: 'user',
            parts: [{ kind: 'text', text: message }],
            ...(opts.contextId ? { contextId: opts.contextId } : {}),
          },
        });

        if (opts.json) {
          console.log(JSON.stringify(response));
        } else {
          console.log(JSON.stringify(response, null, 2));
        }
      } catch (err) {
        console.error(`Error: ${formatA2AError(err)}`);
        process.exit(1);
      }
    });
}
