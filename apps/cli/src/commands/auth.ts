import { Command } from 'commander';
import { spawn } from 'child_process';
import { getEffectiveConfig } from '../config.js';

export function makeAuthCommand(): Command {
  const cmd = new Command('auth').description('Authentication commands');

  cmd
    .command('login')
    .description('Open the wallet web app in a browser to log in and get a token')
    .option('--url <url>', 'Web app URL to open (overrides config)')
    .action((opts: { url?: string }) => {
      const cfg = getEffectiveConfig({ url: opts.url });
      const url = cfg.url;

      const [bin, args]: [string, string[]] =
        process.platform === 'darwin' ? ['open', [url]] :
        process.platform === 'win32'  ? ['cmd', ['/c', 'start', '', url]] :
        ['xdg-open', [url]];

      console.log(`Opening ${url} ...`);
      const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
      child.on('error', () => {
        console.error(`Error: Could not open browser. Open manually: ${url}`);
        process.exit(1);
      });
      child.unref();
    });

  return cmd;
}
