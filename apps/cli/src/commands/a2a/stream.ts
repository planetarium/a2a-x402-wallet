import { Command } from 'commander';
import { randomUUID } from 'crypto';
import { buildClientFactory, formatA2AError } from './client.js';
import { getConnection } from '../../store/config.js';

export function makeStreamCommand(): Command {
  return new Command('stream')
    .description("Send a text message and stream the agent's response in real time via SSE.\nText parts are written to stdout as they arrive; other events are printed as JSON.")
    .argument('<url>', 'Agent base URL (e.g. https://my-agent.example.com)')
    .argument('<message>', 'Text message to send')
    .option('--context-id <id>', 'Continue an existing conversation context')
    .option('--bearer <token>', 'Bearer token for agent authentication')
    .option('--json', 'Output each event as raw JSON (one line per event)')
    .action(async (url: string, message: string, opts: { contextId?: string; bearer?: string; json?: boolean }) => {
      const bearer = opts.bearer ?? getConnection(url)?.apiKey;
      const factory = buildClientFactory(bearer);
      try {
        const client = await factory.createFromUrl(url);
        const stream = client.sendMessageStream({
          message: {
            kind: 'message',
            messageId: randomUUID(),
            role: 'user',
            parts: [{ kind: 'text', text: message }],
            ...(opts.contextId ? { contextId: opts.contextId } : {}),
          },
        });

        for await (const event of stream) {
          if (opts.json) {
            console.log(JSON.stringify(event));
          } else if (event.kind === 'message') {
            for (const part of event.parts) {
              if (part.kind === 'text') process.stdout.write(part.text);
            }
          } else {
            // task, status-update, artifact-update 이벤트
            console.log(JSON.stringify(event, null, 2));
          }
        }

        if (!opts.json) process.stdout.write('\n');
      } catch (err) {
        const msg = formatA2AError(err);
        if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
          const origin = new URL(url).origin;
          console.error(`Error: Authentication failed (401 Unauthorized).`);
          console.error(`To connect, run:\n  a2a-wallet a2a auth ${origin}`);
        } else {
          console.error(`Error: ${msg}`);
        }
        process.exit(1);
      }
    });
}
