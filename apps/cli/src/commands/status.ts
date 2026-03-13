import { Command } from 'commander';
import { readConfig, getEffectiveConfig } from '../store/config.js';
import { LocalWalletProvider } from '../wallet/local.js';
import { resolveSigner } from '../wallet/signer.js';

function parseJwtExpiry(token: string): Date | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    ) as { exp?: number };
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

const DIVIDER = '  ' + '─'.repeat(42);

function row(label: string, value: string): void {
  console.log(`  ${label.padEnd(10)}${value}`);
}

export function makeStatusCommand(): Command {
  return new Command('status')
    .description('Show authentication status, default wallet, and wallet address')
    .option('--url <url>', 'Web app URL (overrides config)')
    .option('--json', 'Output as JSON')
    .action(async (opts: { url?: string; json?: boolean }) => {
      const cfg = getEffectiveConfig({ url: opts.url });
      const config = readConfig();

      // ── Auth status ──────────────────────────────────────────────────────
      type AuthStatus = 'logged-in' | 'expired' | 'not-logged-in';
      let authStatus: AuthStatus;
      let authExpiry: Date | null = null;

      if (cfg.token) {
        authExpiry = parseJwtExpiry(cfg.token);
        authStatus = authExpiry && authExpiry < new Date() ? 'expired' : 'logged-in';
      } else {
        authStatus = 'not-logged-in';
      }

      // ── Default wallet ───────────────────────────────────────────────────
      const defaultWallet = config.defaultWallet;

      type WalletStatus = {
        type: 'local' | 'custodial';
        name?: string;
        address?: string;
        derivationPath?: string;
        addressError?: string;
      };

      let wallet: WalletStatus | null = null;

      if (defaultWallet?.type === 'local') {
        const provider = new LocalWalletProvider();
        const entries = await provider.list().catch(() => []);
        const entry = entries.find((w) => w.name === defaultWallet.name);
        wallet = {
          type: 'local',
          name: defaultWallet.name,
          address: entry?.address ?? '(wallet not found)',
          ...(entry?.derivationPath ? { derivationPath: entry.derivationPath } : {}),
        };
      } else if (defaultWallet?.type === 'custodial') {
        wallet = { type: 'custodial' };
        if (authStatus === 'logged-in') {
          try {
            const signer = await resolveSigner({ url: opts.url });
            wallet.address = await signer.getAddress();
          } catch (err) {
            wallet.addressError = err instanceof Error ? err.message : String(err);
          }
        }
      }

      // ── JSON output ──────────────────────────────────────────────────────
      if (opts.json) {
        console.log(JSON.stringify({
          auth: {
            status: authStatus,
            url: cfg.url,
            ...(authExpiry ? { expiresAt: authExpiry.toISOString() } : {}),
          },
          defaultWallet: wallet,
        }, null, 2));
        return;
      }

      // ── Human-readable output ────────────────────────────────────────────
      console.log('\n  Auth');
      console.log(DIVIDER);
      const statusLabel: Record<AuthStatus, string> = {
        'logged-in': 'logged in',
        'expired': 'token expired',
        'not-logged-in': 'not logged in',
      };
      row('Status', statusLabel[authStatus]);
      if (authExpiry) row('Expires', authExpiry.toLocaleString());
      row('URL', cfg.url);

      console.log('\n  Default Wallet');
      console.log(DIVIDER);
      if (!wallet) {
        console.log('  (not set)');
        console.log('  Run "wallet use <name>" to set a local wallet,');
        console.log('  or "wallet use --custodial" to use the custodial wallet.');
      } else {
        row('Type', wallet.type);
        if (wallet.name) row('Name', wallet.name);
        if (wallet.address) row('Address', wallet.address);
        if (wallet.derivationPath) row('Path', wallet.derivationPath);
        if (wallet.type === 'custodial' && authStatus !== 'logged-in') {
          row('Address', '(login required — run "auth login")');
        }
        if (wallet.addressError) {
          row('Address', `(error: ${wallet.addressError})`);
        }
      }
      console.log();
    });
}
