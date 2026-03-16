import { Command } from 'commander';
import { getEffectiveConfig, readConfig, writeConfig } from '../store/config.js';
import { tryOpenBrowser } from '../utils.js';

export function logTokenSaved(token: string): void {
  console.log('Token saved. You are now logged in.');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    if (payload.exp) {
      const expiresAt = new Date(payload.exp * 1000);
      const diffMs = expiresAt.getTime() - Date.now();
      const diffMin = Math.round(diffMs / 60_000);
      const diffHours = Math.round(diffMs / 3_600_000);
      const diffDays = Math.round(diffMs / 86_400_000);
      if (diffMs <= 0) {
        console.log('Warning: This token has already expired.');
      } else if (diffMin < 60) {
        console.log(`This token is valid for ${diffMin} more minute${diffMin !== 1 ? 's' : ''}.`);
      } else if (diffHours < 48) {
        console.log(`This token is valid for ${diffHours} more hour${diffHours !== 1 ? 's' : ''}.`);
      } else {
        console.log(`This token is valid for ${diffDays} more day${diffDays !== 1 ? 's' : ''}.`);
      }
    }
  } catch {
    // If JWT is malformed, skip expiry info
  }
}


export const POLL_INTERVAL_MS = 5_000;
export const TIMEOUT_MS = 120_000;

export function makeAuthCommand(): Command {
  const cmd = new Command('auth')
    .description(
      '[DEPRECATED] Manage authentication — use "wallet connect / disconnect" instead (device, logout)\n\n' +
      'DEPRECATION REASON:\n' +
      'This command was originally designed to authenticate with the custodial wallet service.\n' +
      'With the introduction of the `wallet` command, connecting to a custodial wallet is now\n' +
      'handled automatically as part of the wallet workflow.\n\n' +
      'Use `wallet connect` to log in to the custodial wallet service.\n' +
      'Use `wallet disconnect` to log out.\n\n' +
      'This command will be removed in a future version.',
    );

  cmd.hook('preAction', () => {
    process.stderr.write(
      'Warning: `auth` is deprecated and will be removed in a future version.\n' +
      'Use `wallet connect` to log in and `wallet disconnect` to log out.\n',
    );
  });

  const deviceCmd = new Command('device').description('Non-interactive device flow login for agents/scripts (start, poll)');

  // ── auth device start ────────────────────────────────────────────────────────
  // Initiates an RFC 8628-compliant device authorization session.
  deviceCmd
    .command('start')
    .description('Start a device login session (RFC 8628) and print the authorization URL and user code')
    .option('--url <url>', 'Web app URL (overrides config)')
    .option('--json', 'Output the full RFC 8628 authorization response as JSON')
    .action(async (opts: { url?: string; json?: boolean }) => {
      const cfg = getEffectiveConfig({ url: opts.url });
      const baseUrl = cfg.url;

      const res = await fetch(`${baseUrl}/api/device/authorize`, { method: 'POST' })
        .catch(() => null);
      if (!res) {
        console.error('Error: Could not reach the server. Check your network or --url.');
        process.exit(1);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        console.error(`Error: ${res.status} ${body.error ?? `HTTP ${res.status}`}`);
        process.exit(1);
      }

      const body = await res.json().catch(() => null) as {
        device_code: string;
        user_code: string;
        verification_uri: string;
        verification_uri_complete: string;
        expires_in: number;
        interval: number;
      } | null;

      if (!body?.device_code || !body.user_code) {
        console.error('Error: Invalid response from server.');
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(body));
        return;
      }

      tryOpenBrowser(body.verification_uri_complete);
      console.log(`\nTo authorize, open this URL in your browser:\n`);
      console.log(`  ${body.verification_uri_complete}\n`);
      console.log(`Or visit:\n`);
      console.log(`  ${body.verification_uri}\n`);
      console.log(`and enter the code:\n`);
      console.log(`  ${body.user_code}\n`);
      console.log(`Then run:\n`);
      console.log(`  a2a-wallet auth device poll --device-code ${body.device_code}\n`);
      console.log(`(Session expires in ${body.expires_in}s)`);
    });

  // ── auth device poll ─────────────────────────────────────────────────────────
  deviceCmd
    .command('poll')
    .description('Poll until the device login is approved, then save the JWT token to config')
    .option('--device-code <code>', 'Device code returned by "auth device start" (RFC 8628)')
    .option('--nonce <nonce>', '(Legacy) Nonce returned by the old "auth device start" command')
    .option('--url <url>', 'Web app URL (overrides config)')
    .action(async (opts: { deviceCode?: string; nonce?: string; url?: string }) => {
      if (!opts.deviceCode && !opts.nonce) {
        console.error('Error: Provide --device-code (or --nonce for the legacy flow).');
        process.exit(1);
      }

      const cfg = getEffectiveConfig({ url: opts.url });
      const baseUrl = cfg.url;

      // ── RFC 8628 flow (--device-code) ──────────────────────────────────────
      if (opts.deviceCode) {
        console.log(`Waiting for authorization (up to ${TIMEOUT_MS / 1000}s)...`);

        const deadline = Date.now() + TIMEOUT_MS;
        let intervalMs = POLL_INTERVAL_MS;

        while (Date.now() < deadline) {
          const pollRes = await fetch(`${baseUrl}/api/device/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
              device_code: opts.deviceCode,
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
            return;
          }

          switch (data.error) {
            case 'authorization_pending':
              // Normal — keep polling
              break;
            case 'slow_down':
              // Server requests slower polling — cap at 30s so a single wait never exceeds the timeout
              intervalMs = Math.min(intervalMs + 5_000, 30_000);
              break;
            case 'access_denied':
              console.error('Error: Authorization was denied by the user.');
              process.exit(1);
              break;
            case 'expired_token':
              console.error('Error: Device code has expired. Run "auth device start" again.');
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

        console.error('Error: Login timed out. Run "auth device start" to begin a new session.');
        process.exit(1);
      }

      // ── Legacy flow (--nonce) ──────────────────────────────────────────────
      console.log(`Waiting for authentication (up to 2 minutes)...`);

      const deadline = Date.now() + TIMEOUT_MS;

      while (Date.now() < deadline) {
        const pollRes = await fetch(`${baseUrl}/api/auth/device/poll?nonce=${encodeURIComponent(opts.nonce!)}`)
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
          logTokenSaved(data.token);
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
    .description('Remove the saved JWT token from config')
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
