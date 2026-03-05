import { Command } from 'commander';
import { spawn } from 'child_process';
import { createServer } from 'http';
import { getEffectiveConfig, readConfig, writeConfig } from '../config.js';

function openBrowser(url: string): void {
  const [bin, args]: [string, string[]] =
    process.platform === 'darwin' ? ['open', [url]] :
    process.platform === 'win32'  ? ['cmd', ['/c', 'start', '', url]] :
    ['xdg-open', [url]];

  const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {
    console.error(`Could not open browser automatically. Open this URL manually:\n${url}`);
  });
  child.unref();
}


export function makeAuthCommand(): Command {
  const cmd = new Command('auth').description('Authentication commands');

  cmd
    .command('login')
    .description('Log in to the wallet. Use --token to set a token directly in headless environments.')
    .option('--url <url>', 'Web app URL to open (overrides config)')
    .option('--token <token>', 'Save a token directly without opening a browser')
    .action(async (opts: { url?: string; token?: string }) => {
      if (opts.token) {
        const existing = readConfig();
        writeConfig({ ...existing, token: opts.token });
        console.log('Token saved. You are now logged in.');
        return;
      }

      const cfg = getEffectiveConfig({ url: opts.url });
      const baseUrl = cfg.url;

      // Start a local callback server
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
      openBrowser(loginUrl);
      console.log(`Waiting for authentication (up to 2 minutes)...`);
      console.log(`If the browser did not open, visit:\n  ${loginUrl}`);
      console.log(`In headless environments, copy the token from the web app and run:\n  a2a-wallet auth login --token <token>`);

      const token = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          server.close();
          reject(new Error('Login timed out after 2 minutes.'));
        }, 120_000);

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
