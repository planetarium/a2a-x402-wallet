import { Command } from 'commander';
import { randomUUID } from 'crypto';
import { buildClientFactory, formatA2AError, bytesReplacer, resolveAgentCardArgs } from './client.js';
import { getConnection } from '../../store/config.js';
import { readFileAsBytes, parseFileUri } from '../../lib/file.js';
import { resolveSigner } from '../../wallet/signer.js';
import { getX402PaymentInfo } from './x402-handler.js';
import type { FilePart } from '@a2a-js/sdk';


export function makeSendCommand(): Command {
  return new Command('send')
    .description('Send a text message to an agent and wait for the response.\nSupports multi-turn conversations (--context-id) and x402 payment payloads (--metadata).')
    .argument('<url|agentCardUrl>', 'Agent base URL or agent card URL (e.g. from registry search)')
    .argument('<message>', 'Text message to send')
    .option('--context-id <id>', 'Continue an existing conversation context')
    .option('--task-id <id>', 'Task ID to send message to (for payment or multi-turn)')
    .option('--metadata <json>', 'JSON metadata to attach to the message (e.g. x402 payment payload)')
    .option('--bearer <token>', 'Bearer token for agent authentication')
    .option('--file <path|uri>', 'Attach a file to the message (repeatable)', (v: string, acc: string[]) => [...acc, v], [] as string[])
    .option('--allow-x402', 'Automatically sign and submit x402 payment if the agent responds with a payment-required request')
    .option('--json', 'Output raw JSON (single line)')
    .action(async (
      url: string,
      message: string,
      opts: {
        contextId?: string;
        taskId?: string;
        metadata?: string;
        bearer?: string;
        file: string[];
        allowX402?: boolean;
        json?: boolean
      }
    ) => {
      const bearer = opts.bearer ?? getConnection(url)?.apiKey;
      const factory = buildClientFactory(bearer);

      let parsedMetadata: Record<string, unknown> | undefined;
      if (opts.metadata) {
        try {
          parsedMetadata = JSON.parse(opts.metadata);
        } catch {
          console.error('Error: --metadata must be valid JSON');
          process.exit(1);
        }
      }

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

      try {
        const client = await factory.createFromUrl(...resolveAgentCardArgs(url));
        let response = await client.sendMessage({
          message: {
            kind: 'message',
            messageId: randomUUID(),
            role: 'user',
            parts: [{ kind: 'text', text: message }, ...fileParts],
            ...(opts.contextId ? { contextId: opts.contextId } : {}),
            ...(opts.taskId ? { taskId: opts.taskId } : {}),
            ...(parsedMetadata ? { metadata: parsedMetadata } : {}),
          },
        });

        if (opts.allowX402) {
          const paymentInfo = getX402PaymentInfo(response);
          if (paymentInfo) {
            console.error('[x402] Payment required. Signing and submitting...');
            const signer = await resolveSigner();
            const payload = await signer.signX402Payment(paymentInfo.requirements);
            response = await client.sendMessage({
              message: {
                kind: 'message',
                messageId: randomUUID(),
                role: 'user',
                parts: [{ kind: 'text', text: message }, ...fileParts],
                taskId: paymentInfo.taskId,
                ...(paymentInfo.contextId ? { contextId: paymentInfo.contextId } : {}),
                metadata: {
                  'x402.payment.status': 'payment-submitted',
                  'x402.payment.payload': payload,
                },
              },
            });
            console.error('[x402] Payment submitted.');
          }
        }

        if (opts.json) {
          console.log(JSON.stringify(response, bytesReplacer));
        } else {
          console.log(JSON.stringify(response, bytesReplacer, 2));
        }
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
