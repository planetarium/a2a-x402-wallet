import { readFileSync } from 'fs';
import { basename, extname } from 'path';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.csv': 'text/csv',
  '.json': 'application/json', '.xml': 'application/xml',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.zip': 'application/zip',
};

function guessMime(ext: string): string | undefined {
  return MIME_MAP[ext.toLowerCase()];
}

/**
 * Plain data for a file whose content is embedded as base64.
 * Maps directly to A2A FileWithBytes (file.bytes, file.name, file.mimeType).
 */
export interface FileWithBytesData {
  bytes: string;
  name: string;
  mimeType: string;
}

/**
 * Plain data for a file referenced by URI.
 * Maps directly to A2A FileWithUri (file.uri, file.name, file.mimeType).
 */
export interface FileWithUriData {
  uri: string;
  name?: string;
  mimeType?: string;
}

/** Read a local file path and return base64-encoded content with metadata. */
export function readFileAsBytes(filePath: string): FileWithBytesData {
  const bytes = readFileSync(filePath).toString('base64');
  const name = basename(filePath);
  const mimeType = guessMime(extname(filePath)) ?? 'application/octet-stream';
  return { bytes, name, mimeType };
}

/** Parse a remote URI and return file metadata (mimeType guessed from extension if possible). */
export function parseFileUri(uri: string): FileWithUriData {
  const pathname = new URL(uri).pathname;
  const name = basename(pathname) || undefined;
  const mimeType = name ? guessMime(extname(name)) : undefined;
  return { uri, ...(name ? { name } : {}), ...(mimeType ? { mimeType } : {}) };
}
