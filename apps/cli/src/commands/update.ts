import { Command } from 'commander';
import { writeFile, rename, unlink, chmod } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, basename } from 'path';
import { spawn } from 'child_process';
import pkg from '../../package.json' with { type: 'json' };

const REPO = 'planetarium/a2a-x402-wallet';
const BINARY_NAME = 'a2a-wallet';

function detectTarget(): string {
  const { platform, arch } = process;
  if (platform === 'darwin') {
    if (arch === 'arm64') return 'darwin-arm64';
    if (arch === 'x64') return 'darwin-x64';
  } else if (platform === 'linux') {
    if (arch === 'arm64') return 'linux-arm64';
    if (arch === 'x64') return 'linux-x64';
  } else if (platform === 'win32') {
    if (arch === 'x64') return 'windows-x64';
  }
  throw new Error(`Unsupported platform: ${platform} ${arch}`);
}

function isBinaryInstall(): boolean {
  const execName = basename(process.execPath).replace(/\.exe$/i, '');
  return execName === BINARY_NAME;
}

async function fetchLatestVersion(): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  const data = (await res.json()) as { tag_name: string };
  return data.tag_name.replace(/^v/, '');
}

async function downloadBinary(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buffer);
}

// Windows: spawn a detached PowerShell script that replaces the binary after this process exits
function replaceOnWindows(newBin: string, currentBin: string): void {
  const ps = `
Start-Sleep -Milliseconds 500
Move-Item -Force -Path '${newBin}' -Destination '${currentBin}'
`.trim();
  spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    detached: true,
    stdio: 'ignore',
  }).unref();
}

export function makeUpdateCommand(): Command {
  return new Command('update')
    .description('Update a2a-wallet to the latest version')
    .action(async () => {
      if (!isBinaryInstall()) {
        console.log('Detected Node.js / npm installation.');
        console.log('To update, reinstall from source:');
        console.log('  pnpm cli:install');
        return;
      }

      // Clean up leftover .old binary from a previous Windows update
      const oldBin = `${process.execPath}.old`;
      if (process.platform === 'win32' && existsSync(oldBin)) {
        unlink(oldBin).catch(() => {});
      }

      console.log(`Current version: v${pkg.version}`);
      process.stdout.write('Checking for updates... ');

      let latestVersion: string;
      try {
        latestVersion = await fetchLatestVersion();
        console.log(`latest: v${latestVersion}`);
      } catch (err) {
        console.error(`\nFailed to fetch latest version: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      if (latestVersion === pkg.version) {
        console.log('Already up to date.');
        return;
      }

      let target: string;
      try {
        target = detectTarget();
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      const ext = process.platform === 'win32' ? '.exe' : '';
      const artifact = `${BINARY_NAME}-${target}${ext}`;
      const url = `https://github.com/${REPO}/releases/download/v${latestVersion}/${artifact}`;

      console.log(`Downloading v${latestVersion} for ${target}...`);

      const tmpFile = join(tmpdir(), `a2a-wallet-${Date.now()}${ext}`);
      try {
        await downloadBinary(url, tmpFile);
      } catch (err) {
        console.error(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      const currentBin = process.execPath;

      try {
        if (process.platform === 'win32') {
          // Windows: cannot overwrite a running .exe; delegate to PowerShell after exit
          replaceOnWindows(tmpFile, currentBin);
          console.log(`Updating to v${latestVersion}... restart a2a-wallet to use the new version.`);
        } else {
          await chmod(tmpFile, 0o755);
          // Unix rename dance: rename current → .old, move new → current, delete .old
          await rename(currentBin, oldBin);
          try {
            await rename(tmpFile, currentBin);
          } catch (err) {
            // Rollback
            await rename(oldBin, currentBin).catch(() => {});
            throw err;
          }
          unlink(oldBin).catch(() => {});
          console.log(`Updated to v${latestVersion}. Run 'a2a-wallet --version' to verify.`);
        }
      } catch (err) {
        console.error(`Failed to replace binary: ${err instanceof Error ? err.message : String(err)}`);
        unlink(tmpFile).catch(() => {});
        process.exit(1);
      }
    });
}
