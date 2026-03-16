import { Command } from 'commander';
import { getEffectiveConfig, readConfig, writeConfig, setDefaultWallet } from '../../store/config.js';
import { tryOpenBrowser } from '../../utils.js';
import { logTokenSaved, POLL_INTERVAL_MS, TIMEOUT_MS } from '../auth.js';

export function makeWalletConnectCommand(): Command {
  return new Command('connect')
    .description('Log in to the custodial wallet service (run without --poll to start, then with --poll to complete)')
    .option('--poll <device-code>', 'Poll for the token using the device code from the previous step')
    .option('--url <url>', 'Web app URL (overrides config)')
    .option('--json', 'Output the device authorization response as JSON')
    .action(async (opts: { poll?: string; url?: string; json?: boolean }) => {
      const cfg = getEffectiveConfig({ url: opts.url });
      const baseUrl = cfg.url;

      // ── Step 2: poll ───────────────────────────────────────────────────────
      if (opts.poll) {
        console.log(`Waiting for authorization (up to ${TIMEOUT_MS / 1000}s)...`);

        const deadline = Date.now() + TIMEOUT_MS;
        let intervalMs = POLL_INTERVAL_MS;

        while (Date.now() < deadline) {
          const pollRes = await fetch(`${baseUrl}/api/device/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
              device_code: opts.poll,
            }),
          }).catch(() => null);

          if (!pollRes) {
            await new Promise((r) => setTimeout(r, intervalMs));
            continue;
          }

          const data = await pollRes.json().catch(() => ({})) as {
            access_token?: string;
            error?: string;
          };

          if (pollRes.ok && data.access_token) {
            const existing = readConfig();
            writeConfig({ ...existing, token: data.access_token });
            logTokenSaved(data.access_token);
            setDefaultWallet({ type: 'custodial' });
            console.log('Active wallet set to custodial.');
            return;
          }

          switch (data.error) {
            case 'authorization_pending':
              break;
            case 'slow_down':
              intervalMs = Math.min(intervalMs + 5_000, 30_000);
              break;
            case 'access_denied':
              console.error('Error: Authorization was denied by the user.');
              process.exit(1);
              break;
            case 'expired_token':
              console.error('Error: Device code has expired. Run "wallet connect" again.');
              process.exit(1);
              break;
            default:
              if (pollRes.status === 429) {
                const retryAfter = Number(pollRes.headers.get('Retry-After') ?? intervalMs / 1000);
                console.error(`429 Too many requests. Retrying in ${retryAfter}s...`);
                await new Promise((r) => setTimeout(r, retryAfter * 1000));
                continue;
              }
              console.error(`Warning: Unexpected response (${pollRes.status}). Retrying...`);
          }

          await new Promise((r) => setTimeout(r, intervalMs));
        }

        console.error('Error: Login timed out. Run "wallet connect" to begin a new session.');
        process.exit(1);
        return;
      }

      // ── Step 1: start ──────────────────────────────────────────────────────
      const startRes = await fetch(`${baseUrl}/api/device/authorize`, { method: 'POST' })
        .catch(() => null);
      if (!startRes) {
        console.error('Error: Could not reach the server. Check your network or --url.');
        process.exit(1);
      }
      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({})) as { error?: string };
        console.error(`Error: ${startRes.status} ${body.error ?? `HTTP ${startRes.status}`}`);
        process.exit(1);
      }

      const deviceData = await startRes.json().catch(() => null) as {
        device_code: string;
        user_code: string;
        verification_uri: string;
        verification_uri_complete: string;
        expires_in: number;
        interval: number;
      } | null;

      if (!deviceData?.device_code || !deviceData.user_code) {
        console.error('Error: Invalid response from server.');
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(deviceData));
        return;
      }

      tryOpenBrowser(deviceData.verification_uri_complete);
      console.log(`\nTo authorize, open this URL in your browser:\n`);
      console.log(`  ${deviceData.verification_uri_complete}\n`);
      console.log(`Or visit:\n`);
      console.log(`  ${deviceData.verification_uri}\n`);
      console.log(`and enter the code:\n`);
      console.log(`  ${deviceData.user_code}\n`);
      console.log(`Then run:\n`);
      console.log(`  a2a-wallet wallet connect --poll ${deviceData.device_code}\n`);
      console.log(`(Session expires in ${deviceData.expires_in}s)`);
    });
}
