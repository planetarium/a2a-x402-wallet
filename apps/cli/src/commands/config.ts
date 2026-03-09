import { Command } from 'commander';
import { readConfig, writeConfig, DEFAULT_URL } from '../config.js';

export function makeConfigCommand(): Command {
  const cmd = new Command('config').description('Read and write CLI configuration stored in ~/.a2a-wallet/config.json (set, get)');

  cmd
    .command('set <key> <value>')
    .description('Save a config value by key — supported keys: token, url')
    .action((key: string, value: string) => {
      const supported = ['token', 'url'];
      if (!supported.includes(key)) {
        console.error(`Error: Unknown key "${key}". Supported keys: ${supported.join(', ')}`);
        process.exit(1);
      }
      const config = readConfig();
      config[key as 'token' | 'url'] = value;
      writeConfig(config);
      console.log(`✓ ${key} saved.`);
    });

  cmd
    .command('get [key]')
    .description('Print current config values (token is partially masked)')
    .action((key?: string) => {
      const config = readConfig();
      const url = config.url ?? DEFAULT_URL;
      const token = config.token;

      if (key) {
        if (key === 'url') {
          console.log(url);
        } else if (key === 'token') {
          if (token) {
            const masked = token.length > 12 ? `${token.slice(0, 8)}...${token.slice(-4)}` : '***';
            console.log(masked);
          } else {
            console.log('(not set)');
          }
        } else {
          console.error(`Error: Unknown key "${key}".`);
          process.exit(1);
        }
        return;
      }

      console.log(`url:   ${url}`);
      if (token) {
        const masked =
          token.length > 12
            ? `${token.slice(0, 8)}...${token.slice(-4)}`
            : '***';
        console.log(`token: ${masked}`);
      } else {
        console.log('token: (not set)');
      }
    });

  return cmd;
}
