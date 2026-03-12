import { Command } from 'commander';
import { setConnection } from '../../store/config.js';
import { fetchAgentCard, findDeviceCodeFlow } from '../../services/a2a.js';
import { savePendingAuth, getPendingAuth, deletePendingAuth } from '../../store/pending-auths.js';

const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

export function makeAuthCommand(): Command {
  return new Command('auth')
    .description(
      'Authenticate with an A2A service via device flow (RFC 8628) and save the access token.\n\n' +
      'First run: starts the device flow and prints the login URL.\n' +
      'Second run (--user-code): polls for completion using the code shown in the browser.',
    )
    .argument('<url>', 'A2A service base URL (e.g. https://external-service.com)')
    .option('--user-code <code>', 'Poll for a previously started device flow using the user code (e.g. WDJB-MJHT)')
    .action(async (url: string, opts: { userCode?: string }) => {
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

      // --- POLL TRACK (--user-code) ---
      if (opts.userCode) {
        const pending = getPendingAuth(opts.userCode);
        if (!pending) {
          console.error('Error: No pending auth found for that user code (it may have expired).');
          console.error('Run the command without --user-code to start a new flow.');
          process.exit(1);
        }

        console.log('Checking authentication status...');

        const body = new URLSearchParams({
          grant_type:  DEVICE_CODE_GRANT,
          device_code: pending.deviceCode,
          client_id:   'a2a-wallet',
        });

        const pollRes = await fetch(pending.tokenUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    body.toString(),
        }).catch(() => null);

        if (!pollRes) {
          console.error('Error: Could not reach the token endpoint.');
          process.exit(1);
        }

        const data = await pollRes.json().catch(() => ({})) as Record<string, string>;
        const error = pollRes.ok ? undefined : (data.error ?? `HTTP ${pollRes.status}`);

        if (error === 'expired_token') {
          deletePendingAuth(opts.userCode);
          console.error('Error: Device code expired. Please run the command again to restart.');
          process.exit(1);
        }

        if (error === 'access_denied') {
          deletePendingAuth(opts.userCode);
          console.error('Error: Authorization was denied.');
          process.exit(1);
        }

        if (error === 'authorization_pending') {
          console.log('Login is not yet complete. After finishing login in your browser, run:');
          console.log(`  a2a-wallet a2a auth ${url} --user-code ${opts.userCode}`);
          process.exit(0);
        }

        if (error === 'slow_down') {
          console.log('Polling too fast. Wait a moment, then run:');
          console.log(`  a2a-wallet a2a auth ${url} --user-code ${opts.userCode}`);
          process.exit(0);
        }

        if (error) {
          console.error(`Error: poll failed — ${error}`);
          process.exit(1);
        }

        if (data.access_token) {
          deletePendingAuth(opts.userCode);
          setConnection(origin, {
            apiKey:      data.access_token,
            connectedAt: new Date().toISOString(),
          });
          console.log(`Connected to ${origin}`);
          return;
        }

        console.error('Error: Unexpected response from server.');
        process.exit(1);
      }

      // --- START TRACK ---
      const startRes = await fetch(flow.deviceAuthorizationUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    'client_id=a2a-wallet',
      }).catch(() => null);

      if (!startRes?.ok) {
        const body = await startRes?.json().catch(() => ({})) as { error?: string };
        console.error(`Error: device/start failed — ${body?.error ?? `HTTP ${startRes?.status}`}`);
        process.exit(1);
      }

      const start = await startRes.json() as {
        device_code:               string;
        user_code:                 string;
        verification_uri:          string;
        verification_uri_complete?: string;
        expires_in?:               number;
        interval?:                 number;
      };

      if (!start.device_code || !start.user_code || !start.verification_uri) {
        console.error('Error: Invalid response from device/start.');
        process.exit(1);
      }

      // Save device_code keyed by user_code — device_code never shown to user
      const expiresAt = new Date(Date.now() + (start.expires_in ?? 300) * 1000).toISOString();
      savePendingAuth(start.user_code, {
        deviceCode: start.device_code,
        tokenUrl:   flow.tokenUrl,
        expiresAt,
      });

      const loginUrl = start.verification_uri_complete ?? start.verification_uri;
      console.log('To authenticate, open the following URL in a browser:');
      console.log(`  ${loginUrl}`);
      console.log('');
      console.log('After completing login, run:');
      console.log(`  a2a-wallet a2a auth ${url} --user-code ${start.user_code}`);
    });
}
