import { spawn } from 'child_process';

export function tryOpenBrowser(url: string): void {
  const [bin, args]: [string, string[]] =
    process.platform === 'darwin' ? ['open', [url]] :
    process.platform === 'win32'  ? ['cmd', ['/c', 'start', '', url]] :
    ['xdg-open', [url]];

  const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => { /* no browser available — that's fine */ });
  child.unref();
}
