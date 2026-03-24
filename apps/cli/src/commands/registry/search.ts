import { Command } from 'commander';
import { searchAgents, type AgentSummary } from '../../api/agent-registry.js';
import { getRegistryUrl } from '../../store/config.js';

export function makeSearchCommand(): Command {
  return new Command('search')
    .description('Search for A2A agents in the agent registry')
    .argument('[query]', 'search query in quotes, e.g. "payment agent" (omit to list recent agents)')
    .option('-n, --limit <number>', 'max results to return', '10')
    .option('--registry <url>', 'agent-registry base URL')
    .option('--json', 'output raw JSON')
    .action(async (query: string | undefined, opts) => {
      const registryUrl = getRegistryUrl(opts.registry as string | undefined);
      const limit = parseInt(opts.limit as string, 10);

      let results: AgentSummary[];
      try {
        results = await searchAgents(registryUrl, query, limit);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      if (results.length === 0) {
        console.log(query ? `No agents found matching "${query}".` : 'No agents registered yet.');
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      printTable(results);
    });
}

function printTable(results: AgentSummary[]): void {
  const SEP = '  ';
  const nameW = Math.max('name'.length, ...results.map((r) => r.name.length));
  const descW = Math.max('description'.length, ...results.map((r) => clip(r.description, 48).length));

  const header = [
    'name'.padEnd(nameW),
    'description'.padEnd(descW),
    'agent_card_url',
  ].join(SEP);

  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of results) {
    console.log([
      r.name.padEnd(nameW),
      clip(r.description, 48).padEnd(descW),
      r.agentCardUrl,
    ].join(SEP));
  }
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
