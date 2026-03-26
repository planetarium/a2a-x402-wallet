import { Command } from 'commander';
import { DefaultAgentCardResolver } from '@a2a-js/sdk/client';
import { resolveAgentCardArgs } from './client.js';

export function makeCardCommand(): Command {
  return new Command('card')
    .description("Fetch and display an agent's AgentCard from /.well-known/agent-card.json.\nShows the agent's name, capabilities, skills, and supported extensions.")
    .argument('<url|agentCardUrl>', 'Agent base URL or agent card URL (e.g. from registry search)')
    .option('--path <path>', 'Custom agent card path (default: /.well-known/agent-card.json)')
    .option('--json', 'Output raw JSON (single line)')
    .action(async (url: string, opts: { path?: string; json?: boolean }) => {
      const resolver = new DefaultAgentCardResolver();
      try {
        const [resolvedUrl, resolvedPath] = resolveAgentCardArgs(url);
        const card = await resolver.resolve(resolvedUrl, opts.path ?? resolvedPath);
        if (opts.json) {
          console.log(JSON.stringify(card));
        } else {
          console.log(JSON.stringify(card, null, 2));
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
