import { Command } from 'commander';
import { LocalWalletProvider } from '../../wallet/local.js';
import { readConfig, getEffectiveConfig } from '../../store/config.js';
import { formatDateTime } from '../../utils.js';
import { resolveWalletAddress } from '../siwe/helpers.js';

const CUSTODIAL_TIMEOUT_MS = 30_000;

type CustodialFetchResult =
  | { ok: true; address: string }
  | { ok: false; reason: 'not-connected' | 'expired' | 'timeout' | 'error' };

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'),
    ) as { exp?: number };
    return payload.exp ? new Date(payload.exp * 1000) < new Date() : false;
  } catch {
    return false;
  }
}

async function fetchCustodialAddress(url: string, token: string): Promise<CustodialFetchResult> {
  try {
    const address = await resolveWalletAddress(url, token, CUSTODIAL_TIMEOUT_MS);
    return { ok: true, address };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('timed out');
    return { ok: false, reason: isTimeout ? 'timeout' : 'error' };
  }
}

export function makeWalletListCommand(): Command {
  return new Command('list')
    .description('List all saved wallets (local and custodial)')
    .option('--json', 'Output as JSON')
    .action(async (opts: { json?: boolean }) => {
      const provider = new LocalWalletProvider();
      try {
        const localWallets = await provider.list();
        const config = readConfig();
        const defaultWallet = config.defaultWallet;
        const cfg = getEffectiveConfig();

        const isDefaultLocal = (name: string) =>
          defaultWallet?.type === 'local' && defaultWallet.name === name;
        const isDefaultCustodial = defaultWallet?.type === 'custodial';

        const custodialResult: CustodialFetchResult = !cfg.token
          ? { ok: false, reason: 'not-connected' }
          : isTokenExpired(cfg.token)
            ? { ok: false, reason: 'expired' }
            : await fetchCustodialAddress(cfg.url, cfg.token);

        if (opts.json) {
          const localEntries = localWallets.map((w) => ({
            name: w.name,
            address: w.address,
            type: w.type,
            ...(w.derivationPath ? { derivationPath: w.derivationPath } : {}),
            default: isDefaultLocal(w.name),
            createdAt: w.createdAt,
          }));
          const custodialEntry = {
            type: 'custodial',
            address: custodialResult.ok ? custodialResult.address : null,
            connected: custodialResult.ok,
            default: isDefaultCustodial,
          };
          console.log(JSON.stringify([...localEntries, custodialEntry], null, 2));
          return;
        }

        const nameWidth = Math.max(4, ...localWallets.map((w) => w.name.length), '(custodial)'.length);
        const addrWidth = 42;
        const typeWidth = 11; // 'private-key' length
        const header =
          '  ' +
          'NAME'.padEnd(nameWidth) +
          '  ' +
          'ADDRESS'.padEnd(addrWidth) +
          '  ' +
          'TYPE'.padEnd(typeWidth) +
          '  ' +
          'CREATED AT';
        console.log(header);

        for (const w of localWallets) {
          const marker = isDefaultLocal(w.name) ? '*' : ' ';
          const suffix = w.type === 'mnemonic' && w.derivationPath ? `  (${w.derivationPath})` : '';
          console.log(
            `${marker} ${w.name.padEnd(nameWidth)}  ${w.address.padEnd(addrWidth)}  ${w.type.padEnd(typeWidth)}  ${formatDateTime(w.createdAt)}${suffix}`,
          );
        }

        const custodialMarker = isDefaultCustodial ? '*' : ' ';
        const custodialAddrDisplay = custodialResult.ok
          ? custodialResult.address.padEnd(addrWidth)
          : {
              'not-connected': '(not connected)',
              expired: '(token expired)',
              timeout: '(timed out)',
              error: '(error)',
            }[custodialResult.reason].padEnd(addrWidth);
        console.log(
          `${custodialMarker} ${'(custodial)'.padEnd(nameWidth)}  ${custodialAddrDisplay}  ${'custodial'.padEnd(typeWidth)}  -`,
        );
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
