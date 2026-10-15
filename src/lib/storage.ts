import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * Private file storage. Local disk in development, outside public/ so nothing
 * is reachable by URL. Files are only ever served through a route that checks
 * who is asking. Swapping this for S3 later means replacing these two functions.
 */
const ROOT = resolve(process.cwd(), 'storage');

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function putPrivate(prefix: string, file: File): Promise<string> {
  const key = `${prefix}/${randomUUID()}.${EXT[file.type] ?? 'bin'}`;
  const path = safePath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(await file.arrayBuffer()));
  return key;
}

export async function getPrivate(key: string): Promise<Buffer> {
  return readFile(safePath(key));
}

export async function removePrivate(key: string): Promise<void> {
  await rm(safePath(key), { force: true });
}

/** Keys come from our own database, but never trust a path blindly. */
function safePath(key: string): string {
  const path = resolve(join(ROOT, key));
  if (!path.startsWith(ROOT + '/') && !path.startsWith(ROOT + '\\')) {
    throw new Error('Refusing a storage key outside the storage root.');
  }
  return path;
}

/**
 * Check the file is what it claims to be from its first bytes, not just the
 * browser-supplied MIME type, which the client controls.
 */
export async function sniffMatches(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...b: number[]) => b.every((v, i) => head[i] === v);
  switch (file.type) {
    case 'application/pdf':
      return starts(0x25, 0x50, 0x44, 0x46); // %PDF
    case 'image/png':
      return starts(0x89, 0x50, 0x4e, 0x47);
    case 'image/jpeg':
      return starts(0xff, 0xd8, 0xff);
    case 'image/webp':
      return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    default:
      return false;
  }
}
