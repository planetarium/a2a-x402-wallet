import { Command } from 'commander';
import { randomUUID } from 'crypto';
import { buildClientFactory, formatA2AError, bytesReplacer, resolveAgentCardArgs } from './client.js';
import { getConnection } from '../../store/config.js';
import { readFileAsBytes, parseFileUri } from '../../lib/file.js';
import { resolveSigner } from '../../wallet/signer.js';
import { getX402PaymentInfo } from './x402-handler.js';
import type { FilePart } from '@a2a-js/sdk';

export function makeStreamCommand(): Command {
  return new Command('stream')
    .description("Send a text message and stream the agent's response in real time via SSE.\nText parts are written to stdout as they arrive; other events are printed as JSON.")
    .argument('<url|agentCardUrl>', 'Agent base URL or agent card URL (e.g. from registry search)')
    .argument('<message>', 'Text message to send')
    .option('--context-id <id>', 'Continue an existing conversation context')
    .option('--bearer <token>', 'Bearer token for agent authentication')
    .option('--file <path|uri>', 'Attach a file to the message (repeatable)', (v: string, acc: string[]) => [...acc, v], [] as string[])
    .option('--allow-x402', 'Automatically sign and submit x402 payment if the agent responds with a payment-required request')
    .option('--json', 'Output each event as raw JSON (one line per event)')
    .action(async (url: string, message: string, opts: { contextId?: string; bearer?: string; file: string[]; allowX402?: boolean; json?: boolean }) => {
      const bearer = opts.bearer ?? getConnection(url)?.apiKey;
      const factory = buildClientFactory(bearer);

      const fileParts: FilePart[] = [];
      for (const f of opts.file) {
        try {
          fileParts.push(
            /^https?:\/\//.test(f)
              ? { kind: 'file', file: parseFileUri(f) }
              : { kind: 'file', file: readFileAsBytes(f) }
          );
        } catch (err) {
          console.error(`Error: Failed to read file "${f}": ${err instanceof Error ? err.message : err}`);
          process.exit(1);
        }
      }

      const printEvent = (event: unknown) => {
        if (opts.json) {
          console.log(JSON.stringify(event, bytesReplacer));
        } else if (event && typeof event === 'object' && (event as Record<string, unknown>)['kind'] === 'message') {
          const msg = event as { parts: Array<{ kind: string; text?: string }> };
          for (const part of msg.parts) {
            if (part.kind === 'text' && part.text) process.stdout.write(part.text);
          }
        } else {
          // task, status-update, artifact-update 이벤트
          console.log(JSON.stringify(event, bytesReplacer, 2));
        }
      };

      try {
        const client = await factory.createFromUrl(...resolveAgentCardArgs(url));
        const stream = client.sendMessageStream({
          message: {
            kind: 'message',
            messageId: randomUUID(),
            role: 'user',
            parts: [{ kind: 'text', text: message }, ...fileParts],
            ...(opts.contextId ? { contextId: opts.contextId } : {}),
          },
        });

        let x402Handled = false;
        for await (const event of stream) {
          if (opts.allowX402 && !x402Handled) {
            const paymentInfo = getX402PaymentInfo(event);
            if (paymentInfo) {
              x402Handled = true;
              printEvent(event);
              console.error('[x402] Payment required. Signing and submitting...');
              const signer = await resolveSigner();
              const payload = await signer.signX402Payment(paymentInfo.requirements);
              console.error('[x402] Payment submitted.');
              const paymentStream = client.sendMessageStream({
                message: {
                  kind: 'message',
                  messageId: randomUUID(),
                  role: 'user',
                  parts: [{ kind: 'text', text: message }],
                  taskId: paymentInfo.taskId,
                  ...(paymentInfo.contextId ? { contextId: paymentInfo.contextId } : {}),
                  metadata: {
                    'x402.payment.status': 'payment-submitted',
                    'x402.payment.payload': payload,
                  },
                },
              });
              for await (const paymentEvent of paymentStream) {
                printEvent(paymentEvent);
              }
              break;
            }
          }
          printEvent(event);
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
