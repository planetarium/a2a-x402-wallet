import { Command } from 'commander';
import { listConnections, removeConnection } from '../config.js';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function makeConnectionsCommand(): Command {
  const cmd = new Command('connections').description('Manage saved A2A service connections (list, remove)');

  cmd
    .command('list')
    .description('List all saved A2A service connections')
    .action(() => {
      const connections = listConnections();
      if (connections.length === 0) {
        console.log('No connections saved. Run `a2a-wallet connect <url>` to add one.');
        return;
      }

      const serviceHeader = 'service';
      const connectedAtHeader = 'connected_at';
      const serviceWidth = Math.max(serviceHeader.length, ...connections.map((c) => c.origin.length));

      console.log(
        `${serviceHeader.padEnd(serviceWidth)}  ${connectedAtHeader}`,
      );
      for (const { origin, connection } of connections) {
        console.log(
          `${origin.padEnd(serviceWidth)}  ${formatDateTime(connection.connectedAt)}`,
        );
      }
    });

  cmd
    .command('remove')
    .description('Remove a saved A2A service connection')
    .argument('<url>', 'A2A service URL to remove (e.g. https://external-service.com)')
    .action((url: string) => {
      const removed = removeConnection(url);
      if (removed) {
        const origin = new URL(url).origin;
        console.log(`Removed connection to ${origin}`);
      } else {
        const origin = new URL(url).origin;
        console.log(`No connection found for ${origin}`);
      }
    });

  return cmd;
}
