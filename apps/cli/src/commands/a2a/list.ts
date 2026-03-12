import { Command } from 'commander';
import { listConnections } from '../../store/config.js';
import { formatDateTime } from '../../utils.js';

export function makeListCommand(): Command {
  return new Command('list')
    .description('List all saved A2A service connections')
    .action(() => {
      const connections = listConnections();
      if (connections.length === 0) {
        console.log('No connections saved. Run `a2a-wallet a2a auth <url>` to add one.');
        return;
      }

      const serviceHeader = 'service';
      const connectedAtHeader = 'connected_at';
      const serviceWidth = Math.max(serviceHeader.length, ...connections.map((c) => c.origin.length));

      console.log(`${serviceHeader.padEnd(serviceWidth)}  ${connectedAtHeader}`);
      for (const { origin, connection } of connections) {
        console.log(`${origin.padEnd(serviceWidth)}  ${formatDateTime(connection.connectedAt)}`);
      }
    });
}
