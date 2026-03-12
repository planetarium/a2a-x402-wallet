import { Command } from 'commander';
import { removeConnection } from '../../config.js';

export function makeDisconnectCommand(): Command {
  return new Command('disconnect')
    .description('Remove a saved A2A service connection')
    .argument('<url>', 'A2A service URL to remove (e.g. https://external-service.com)')
    .action((url: string) => {
      const origin = new URL(url).origin;
      const removed = removeConnection(url);
      if (removed) {
        console.log(`Removed connection to ${origin}`);
      } else {
        console.log(`No connection found for ${origin}`);
      }
    });
}
