import { Command } from 'commander';
import { setConnection } from '../../config.js';
import { fetchAgentCard, findDeviceCodeFlow } from '../../services/a2a.js';

export function makeAuthCommand(): Command {
  return new Command('auth')
    .description(
      'Authenticate with an A2A service via device flow and save the API Key.\n\n' +
      'Default: starts the device flow, prints the login URL and a resume command, then exits.\n' +
      'Use --nonce <nonce> to poll once after the user has completed login.',
    )
    .argument('<url>', 'A2A service base URL (e.g. https://external-service.com)')
    .option('--nonce <nonce>', 'Poll once for a previously started device flow')
    .action(async (url: string, opts: { nonce?: string }) => {
      const origin = new URL(url).origin;

      // 1. Fetch agent card
      const card = await fetchAgentCard(origin).catch((err: unknown) => {
        console.error(`Error: Could not fetch agent card — ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      });

      // 2. Find device code flow
      const flow = findDeviceCodeFlow(card);
      if (!flow) {
        console.error('Error: This service does not support device flow authentication.');
        process.exit(1);
      }

      // --- RESUME TRACK (--nonce) ---
      // Poll once to check if the user has completed login.
      if (opts.nonce) {
        console.log('Checking authentication status...');
        const pollRes = await fetch(
          `${flow.tokenUrl}?code=${encodeURIComponent(opts.nonce)}`,
        ).catch(() => null);

        if (!pollRes) {
          console.error('Error: Could not reach the poll endpoint.');
          process.exit(1);
        }

        if (pollRes.status === 404) {
          console.error('Error: Device code expired or not found. Please run `a2a auth` again.');
          process.exit(1);
        }

        if (!pollRes.ok) {
          const body = await pollRes.json().catch(() => ({})) as { error?: string };
          console.error(`Error: poll failed — ${body?.error ?? `HTTP ${pollRes.status}`}`);
          process.exit(1);
        }

        const data = await pollRes.json() as { status: string; api_key?: string };

        if (data.status === 'expired') {
          console.error('Error: Device code expired. Please run `a2a auth` again.');
          process.exit(1);
        }

        if (data.status === 'pending') {
          console.log('Login is not yet complete. After finishing login in your browser, run:');
          console.log(`  a2a-wallet a2a auth ${url} --nonce ${opts.nonce}`);
          process.exit(0);
        }

        if (data.status === 'complete' && data.api_key) {
          setConnection(origin, {
            apiKey: data.api_key,
            connectedAt: new Date().toISOString(),
          });
          console.log(`Connected to ${origin}`);
          return;
        }

        console.error('Error: Unexpected response from server.');
        process.exit(1);
      }

      // 3. Start device flow
      const startRes = await fetch(flow.deviceAuthorizationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }).catch(() => null);

      if (!startRes?.ok) {
        const body = await startRes?.json().catch(() => ({})) as { error?: string };
        console.error(`Error: device/start failed — ${body?.error ?? `HTTP ${startRes?.status}`}`);
        process.exit(1);
      }

      const start = await startRes.json() as {
        device_code: string;
        login_url: string;
        expires_in?: number;
        interval?: number;
      };

      if (!start.device_code || !start.login_url) {
        console.error('Error: Invalid response from device/start.');
        process.exit(1);
      }

      // --- DEFAULT TRACK ---
      // Print the login URL and resume command, then exit immediately.
      console.log('To authenticate, open the following URL in a browser:');
      console.log(`  ${start.login_url}`);
      console.log('');
      console.log('After completing login, run:');
      console.log(`  a2a-wallet a2a auth ${url} --nonce ${start.device_code}`);
    });
}
