import { Command } from 'commander';
import { DefaultAgentCardResolver } from '@a2a-js/sdk/client';

export function makeCardCommand(): Command {
  return new Command('card')
    .description("Fetch and display an agent's AgentCard")
    .argument('<url>', 'Agent base URL (e.g. https://my-agent.example.com)')
    .option('--path <path>', 'Custom agent card path (default: /.well-known/agent-card.json)')
    .option('--json', 'Output raw JSON (single line)')
    .action(async (url: string, opts: { path?: string; json?: boolean }) => {
      const resolver = new DefaultAgentCardResolver();
      try {
        const card = await resolver.resolve(url, opts.path);
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
