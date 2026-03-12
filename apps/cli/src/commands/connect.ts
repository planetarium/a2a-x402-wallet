import { Command } from 'commander';
import { setConnection } from '../config.js';
import { tryOpenBrowser } from '../utils.js';

interface DeviceCodeFlow {
  deviceAuthorizationUrl: string;
  tokenUrl: string;
}

function findDeviceCodeFlow(card: unknown): DeviceCodeFlow | null {
  const schemes = (card as Record<string, unknown>)?.securitySchemes;
  if (!schemes || typeof schemes !== 'object') return null;

  for (const scheme of Object.values(schemes)) {
    const flow = (scheme as Record<string, unknown>)?.oauth2SecurityScheme as
      | Record<string, unknown>
      | undefined;
    const deviceCode = flow?.flows as Record<string, unknown> | undefined;
    const dc = deviceCode?.deviceCode as Record<string, unknown> | undefined;
    if (typeof dc?.deviceAuthorizationUrl === 'string' && typeof dc?.tokenUrl === 'string') {
      return {
        deviceAuthorizationUrl: dc.deviceAuthorizationUrl,
        tokenUrl: dc.tokenUrl,
      };
    }
  }
  return null;
}

const DEFAULT_INTERVAL_S = 5;
const DEFAULT_EXPIRES_S = 300;

export function makeConnectCommand(): Command {
  return new Command('connect')
    .description(
      'Connect to an external A2A service via device flow and save the API Key.\n' +
      'Fetches the agent card, opens a browser for login, and polls until complete.',
    )
    .argument('<url>', 'A2A service base URL (e.g. https://external-service.com)')
    .action(async (url: string) => {
      const origin = new URL(url).origin;

      // 1. Fetch agent card
      const cardUrl = `${origin}/.well-known/agent.json`;
      const cardRes = await fetch(cardUrl).catch(() => null);
      if (!cardRes?.ok) {
        console.error(`Error: Could not fetch agent card from ${cardUrl}`);
        process.exit(1);
      }
      const card = await cardRes.json().catch(() => null);

      // 2. Find device code flow
      const flow = findDeviceCodeFlow(card);
      if (!flow) {
        console.error('Error: This service does not support device flow authentication.');
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

      const intervalMs = (start.interval ?? DEFAULT_INTERVAL_S) * 1000;
      const expiresMs = (start.expires_in ?? DEFAULT_EXPIRES_S) * 1000;
      const deadline = Date.now() + expiresMs;

      // 4. Open browser
      console.log(`Opening browser for login...`);
      tryOpenBrowser(start.login_url);
      console.log(`If the browser did not open, visit:\n  ${start.login_url}\n`);
      console.log('Waiting for authentication...');

      // 5. Poll
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, intervalMs));

        const pollRes = await fetch(
          `${flow.tokenUrl}?code=${encodeURIComponent(start.device_code)}`,
        ).catch(() => null);

        if (!pollRes) continue;

        if (pollRes.status === 429) {
          const retryAfter = Number(pollRes.headers.get('Retry-After') ?? intervalMs / 1000);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }

        if (!pollRes.ok) {
          const body = await pollRes.json().catch(() => ({})) as { error?: string };
          console.error(`Error: device/poll failed — ${body?.error ?? `HTTP ${pollRes.status}`}`);
          process.exit(1);
        }

        const data = await pollRes.json() as { status: string; api_key?: string };

        if (data.status === 'expired') {
          console.error('Error: Device code expired. Please try again.');
          process.exit(1);
        }

        if (data.status === 'complete' && data.api_key) {
          setConnection(origin, {
            apiKey: data.api_key,
            connectedAt: new Date().toISOString(),
          });
          console.log(`\nConnected to ${origin}`);
          return;
        }

        // pending — continue polling
      }

      console.error('Error: Authentication timed out.');
      process.exit(1);
    });
}
