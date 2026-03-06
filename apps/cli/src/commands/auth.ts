import { Command } from 'commander';
import { spawn } from 'child_process';
import { createServer } from 'http';
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
    .description('Log in to the wallet (opens browser callback)')
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

      const server = createServer();
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') {
        console.error('Error: Could not start local callback server.');
        process.exit(1);
      }
      const port = address.port;
      const callbackUrl = `http://127.0.0.1:${port}/callback`;

      const loginUrl = `${baseUrl}/cli-login?callback=${encodeURIComponent(callbackUrl)}`;
      console.log(`Opening browser for login...`);
      tryOpenBrowser(loginUrl);
      console.log(`If the browser did not open, visit:\n  ${loginUrl}`);
      console.log(`Waiting for authentication (up to 2 minutes)...`);

      const token = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          server.close();
          reject(new Error('Login timed out after 2 minutes.'));
        }, TIMEOUT_MS);

        server.on('request', (req, res) => {
          const reqUrl = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
          if (reqUrl.pathname !== '/callback') {
            res.writeHead(404).end();
            return;
          }

          const tok = reqUrl.searchParams.get('token');
          const error = reqUrl.searchParams.get('error');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html><html><body>
            <p style="font-family:sans-serif;text-align:center;margin-top:4rem">
              ${tok ? 'Login successful. You may close this tab.' : `Login failed: ${error ?? 'unknown error'}. You may close this tab.`}
            </p>
            <script>window.close()</script>
          </body></html>`);

          server.close();
          clearTimeout(timer);

          if (tok) {
            resolve(tok);
          } else {
            reject(new Error(`Login failed: ${error ?? 'unknown error'}`));
          }
        });
      }).catch((err: Error) => {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }) as string;

      const existing = readConfig();
      writeConfig({ ...existing, token });
      console.log('Token saved. You are now logged in.');
      process.exit(0);
    });

  const deviceCmd = new Command('device').description('Device flow login (recommended for agents)');

  deviceCmd
    .command('start')
    .description('Start a device login session and print the login URL, then exit')
    .option('--url <url>', 'Web app URL (overrides config)')
    .option('--json', 'Output nonce and loginUrl as JSON')
    .action(async (opts: { url?: string; json?: boolean }) => {
      const cfg = getEffectiveConfig({ url: opts.url });
      const baseUrl = cfg.url;

      const startRes = await fetch(`${baseUrl}/api/auth/device/start`, { method: 'POST' })
        .catch(() => null);
      if (!startRes) {
        console.error('Error: Could not reach the server. Check your network or --url.');
        process.exit(1);
      }
      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({})) as { error?: string };
        const msg = body.error ?? `HTTP ${startRes.status}`;
        console.error(`Error: ${startRes.status} ${msg}`);
        process.exit(1);
      }
      const body = await startRes.json().catch(() => null) as { nonce: string; loginUrl: string } | null;
      if (!body?.nonce || !body?.loginUrl) {
        console.error('Error: Invalid response from server.');
        process.exit(1);
      }
      const { nonce, loginUrl } = body;

      if (opts.json) {
        console.log(JSON.stringify({ nonce, loginUrl }));
      } else {
        console.log(`Visit the following URL to log in:\n\n  ${loginUrl}\n`);
        console.log(`Then run:\n\n  a2a-wallet auth device poll --nonce ${nonce}\n`);
      }
    });

  deviceCmd
    .command('poll')
    .description('Poll for device login completion and save the token')
    .requiredOption('--nonce <nonce>', 'Nonce returned by "auth device start"')
    .option('--url <url>', 'Web app URL (overrides config)')
    .action(async (opts: { nonce: string; url?: string }) => {
      const cfg = getEffectiveConfig({ url: opts.url });
      const baseUrl = cfg.url;

      console.log(`Waiting for authentication (up to 2 minutes)...`);

      const deadline = Date.now() + TIMEOUT_MS;

      while (Date.now() < deadline) {
        const pollRes = await fetch(`${baseUrl}/api/auth/device/poll?nonce=${encodeURIComponent(opts.nonce)}`)
          .catch(() => null);

        if (!pollRes) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          continue;
        }

        if (!pollRes.ok) {
          const body = await pollRes.json().catch(() => ({})) as { error?: string };
          const msg = body.error ?? `HTTP ${pollRes.status}`;

          if (pollRes.status === 404) {
            console.error(`Error: ${pollRes.status} ${msg}`);
            process.exit(1);
          }
          if (pollRes.status === 429) {
            const retryAfter = Number(pollRes.headers.get('Retry-After') ?? POLL_INTERVAL_MS / 1000);
            console.error(`${pollRes.status} ${msg}. Retrying in ${retryAfter}s...`);
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          console.error(`Warning: ${pollRes.status} ${msg}. Retrying...`);
          continue;
        }

        const data = await pollRes.json() as { status: string; token?: string };

        if (data.status === 'complete' && data.token) {
          const existing = readConfig();
          writeConfig({ ...existing, token: data.token });
          console.log('Token saved. You are now logged in.');
          return;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      console.error('Error: Login timed out after 2 minutes.');
      process.exit(1);
    });

  cmd.addCommand(deviceCmd);

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
