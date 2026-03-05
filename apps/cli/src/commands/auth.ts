import { Command } from 'commander';
import { spawn } from 'child_process';
import { getEffectiveConfig, readConfig, writeConfig } from '../config.js';

function tryOpenBrowser(url: string): void {
  const [bin, args]: [string, string[]] =
    process.platform === 'darwin' ? ['open', [url]] :
    process.platform === 'win32'  ? ['cmd', ['/c', 'start', '', url]] :
    ['xdg-open', [url]];

  const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => { /* no browser available — that's fine */ });
  child.unref();
}

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 120_000;

export function makeAuthCommand(): Command {
  const cmd = new Command('auth').description('Authentication commands');

  cmd
    .command('login')
    .description('Log in to the wallet')
    .option('--url <url>', 'Web app URL to open (overrides config)')
    .option('--token <token>', 'Save a token directly without opening a browser')
    .action(async (opts: { url?: string; token?: string }) => {
      // Direct token injection
      if (opts.token) {
        const existing = readConfig();
        writeConfig({ ...existing, token: opts.token });
        console.log('Token saved. You are now logged in.');
        return;
      }

      const cfg = getEffectiveConfig({ url: opts.url });
      const baseUrl = cfg.url;

      const startRes = await fetch(`${baseUrl}/api/auth/device/start`, { method: 'POST' })
        .catch(() => null);
      if (!startRes?.ok) {
        console.error('Error: Could not reach the server to start login.');
        process.exit(1);
      }
      const { nonce, loginUrl } = await startRes.json() as { nonce: string; loginUrl: string };

      tryOpenBrowser(loginUrl);
      console.log(`Opening browser for login...`);
      console.log(`If the browser did not open, visit:\n\n  ${loginUrl}\n`);
      console.log(`Waiting for authentication (up to 2 minutes)...`);

      const deadline = Date.now() + TIMEOUT_MS;

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const pollRes = await fetch(`${baseUrl}/api/auth/device/poll?nonce=${encodeURIComponent(nonce)}`)
          .catch(() => null);

        if (!pollRes) continue;

        if (pollRes.status === 404) {
          console.error('Error: Login session expired.');
          process.exit(1);
        }

        const data = await pollRes.json() as { status: string; token?: string };

        if (data.status === 'complete' && data.token) {
          const existing = readConfig();
          writeConfig({ ...existing, token: data.token });
          console.log('Token saved. You are now logged in.');
          return;
        }
      }

      console.error('Error: Login timed out after 2 minutes.');
      process.exit(1);
    });

  cmd
    .command('logout')
    .description('Remove the saved token')
    .action(() => {
      const existing = readConfig();
      if (!existing.token) {
        console.log('Not logged in.');
        return;
      }
      writeConfig({ ...existing, token: undefined });
      console.log('Logged out.');
    });

  return cmd;
}
