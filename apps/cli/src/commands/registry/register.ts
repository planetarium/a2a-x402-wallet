import { Command } from 'commander';
import { registerAgent } from '../../registry-api.js';
import { getRegistryUrl } from '../../store/config.js';

export function makeRegisterCommand(): Command {
  return new Command('register')
    .description('Register an A2A agent in the agent registry')
    .argument('<agent-card-url>', 'URL to the agent card (/.well-known/agent.json)')
    .option('--registry <url>', 'agent-registry base URL')
    .option('--json', 'output raw JSON')
    .action(async (agentCardUrl: string, opts) => {
      const registryUrl = getRegistryUrl(opts.registry as string | undefined);

      let result: unknown;
      try {
        result = await registerAgent(registryUrl, agentCardUrl);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`Agent registered successfully.`);
    });
}
