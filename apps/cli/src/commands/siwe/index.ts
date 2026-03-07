import { Command } from 'commander';
import { recoverMessageAddress, getAddress, isHex, size } from 'viem';
import { getEffectiveConfig } from '../../config.js';
import { callSign, exitNotLoggedIn } from '../../api.js';
import {
  makeSiweMessage,
  encodeToken,
  decodeToken,
  parseSiweMessage,
  readMessageInput,
  resolveWalletAddress,
  die,
} from './helpers.js';
import type { SiweFields, SiweTokenPayload } from './types.js';

export function makeSiweCommand(): Command {
  const cmd = new Command('siwe').description('SIWE (Sign-In with Ethereum) token commands');

  // siwe prepare
  cmd
    .command('prepare')
    .description('Generate an EIP-4361 SIWE message')
    .option('--address <address>', 'Ethereum address (default: your linked wallet address)')
    .requiredOption('--domain <host>', 'Domain (e.g. app.example.com)')
    .requiredOption('--uri <uri>', 'URI (e.g. https://app.example.com)')
    .option('--ttl <duration>', 'Expiration duration (30m, 1h, 7d)', '7d')
    .option('--chain-id <n>', 'EIP-155 chain ID', '1')
    .option('--statement <text>', 'Statement text', 'I accept the Terms of Service')
    .option('--token <jwt>', 'JWT for this request only (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .action(async (opts: {
      address?: string;
      domain: string;
      uri: string;
      ttl: string;
      chainId: string;
      statement: string;
      token?: string;
      url?: string;
    }) => {
      let address = opts.address;

      if (!address) {
        const cfg = getEffectiveConfig({ token: opts.token, url: opts.url });
        if (!cfg.token) exitNotLoggedIn();

        address = await resolveWalletAddress(cfg.url, cfg.token).catch((err: unknown) => {
          die(err instanceof Error ? err.message : String(err));
        });
      }

      let message: string;
      try {
        message = makeSiweMessage(
          address,
          opts.domain,
          opts.uri,
          opts.ttl,
          opts.statement,
          parseInt(opts.chainId, 10),
        );
      } catch (err) {
        die(err instanceof Error ? err.message : String(err));
      }
      console.log(message);
    });

  // siwe encode
  cmd
    .command('encode')
    .description('Encode a SIWE message + signature into a base64url token')
    .requiredOption('--signature <hex>', 'Signature hex')
    .option('--message-file <path>', 'Path to message file (default: stdin)')
    .action(async (opts: { signature: string; messageFile?: string }) => {
      if (!isHex(opts.signature) || size(opts.signature) !== 65) {
        die('--signature must be a 65-byte hex string starting with 0x');
      }
      let message: string;
      try {
        message = await readMessageInput(opts.messageFile);
      } catch (err) {
        die(err instanceof Error ? err.message : String(err));
      }
      const token = encodeToken(message.trimEnd(), opts.signature);
      console.log(token);
    });

  // siwe decode
  cmd
    .command('decode')
    .description('Decode a base64url SIWE token')
    .argument('<token>', 'base64url SIWE token')
    .option('--json', 'Output as JSON')
    .action((token: string, opts: { json?: boolean }) => {
      let decoded: SiweTokenPayload, fields: SiweFields;
      try {
        decoded = decodeToken(token);
        fields = parseSiweMessage(decoded.message);
      } catch (err) {
        return die(err instanceof Error ? err.message : String(err));
      }

      if (opts.json) {
        console.log(JSON.stringify({ ...fields, signature: decoded.signature }, null, 2));
        return;
      }

      const lines = [
        `Address:    ${fields.address}`,
        `Domain:     ${fields.domain}`,
        `Statement:  ${fields.statement}`,
        `URI:        ${fields.uri}`,
        `Chain ID:   ${fields.chainId}`,
        `Nonce:      ${fields.nonce}`,
        `Issued At:  ${fields.issuedAt}`,
        `Expires:    ${fields.expiresAt ?? '(none)'}`,
        `Signature:  ${decoded.signature}`,
      ];
      lines.forEach((l) => console.log(l));
    });

  // siwe verify
  cmd
    .command('verify')
    .description('Verify a SIWE token signature and expiration')
    .argument('<token>', 'base64url SIWE token')
    .action(async (token: string) => {
      let decoded: SiweTokenPayload, fields: SiweFields;
      try {
        decoded = decodeToken(token);
        fields = parseSiweMessage(decoded.message);
      } catch (err) {
        return die(err instanceof Error ? err.message : String(err));
      }

      let recovered: string;
      try {
        recovered = await recoverMessageAddress({ message: decoded.message, signature: decoded.signature as `0x${string}` });
      } catch {
        return die('signature verification failed');
      }

      let expectedAddress: string;
      try {
        expectedAddress = getAddress(fields.address);
      } catch {
        return die('token contains invalid Ethereum address');
      }
      if (recovered !== expectedAddress) {
        die('signature mismatch');
      }

      if (fields.expiresAt) {
        const expiry = new Date(fields.expiresAt);
        if (isNaN(expiry.getTime())) {
          die('token has invalid expiration date');
        }
        if (expiry < new Date()) {
          die('token expired');
        }
      }

      console.log(recovered);
    });

  // siwe auth
  cmd
    .command('auth')
    .description('Prepare, sign, and encode a SIWE token in one step')
    .requiredOption('--domain <host>', 'Domain')
    .requiredOption('--uri <uri>', 'URI')
    .option('--ttl <duration>', 'Expiration duration (30m, 1h, 7d)', '7d')
    .option('--chain-id <n>', 'EIP-155 chain ID', '1')
    .option('--statement <text>', 'Statement text', 'I accept the Terms of Service')
    .option('--token <jwt>', 'JWT for this request only (overrides config)')
    .option('--url <url>', 'Web app URL for this request only (overrides config)')
    .option('--json', 'Output as JSON { token: "..." }')
    .action(async (opts: {
      domain: string;
      uri: string;
      ttl: string;
      chainId: string;
      statement: string;
      token?: string;
      url?: string;
      json?: boolean;
    }) => {
      const cfg = getEffectiveConfig({ token: opts.token, url: opts.url });

      if (!cfg.token) exitNotLoggedIn();

      const address = await resolveWalletAddress(cfg.url, cfg.token).catch((err: unknown) => {
        die(err instanceof Error ? err.message : String(err));
      });

      let message: string;
      try {
        message = makeSiweMessage(
          address,
          opts.domain,
          opts.uri,
          opts.ttl,
          opts.statement,
          parseInt(opts.chainId, 10),
        );
      } catch (err) {
        die(err instanceof Error ? err.message : String(err));
      }

      let signResult: Record<string, unknown>;
      try {
        signResult = await callSign(cfg.url, cfg.token, message) as Record<string, unknown>;
      } catch (err) {
        die(err instanceof Error ? err.message : String(err));
      }

      const signature = signResult['signature'] as string;
      if (!signature) {
        die('signing API did not return a signature');
      }

      const encoded = encodeToken(message.trimEnd(), signature);
      if (opts.json) {
        console.log(JSON.stringify({ token: encoded }, null, 2));
      } else {
        console.log(encoded);
      }
    });

  return cmd;
}
