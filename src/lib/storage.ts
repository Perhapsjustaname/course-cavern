import 'server-only';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { dirname, join, resolve } from 'node:path';
import { bytesMatch } from '@/lib/media';

/**
 * Private file storage. Local disk in development, outside public/ so nothing
 * is reachable by URL. Files are only ever served through a route that checks
 * who is asking. Swapping this for S3 later means replacing these functions.
 */
const ROOT = resolve(process.cwd(), 'storage');

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Small files that arrive whole inside a form, like application documents. */
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

export async function removePrivate(key: string | null | undefined): Promise<void> {
  if (key) await rm(safePath(key), { force: true });
}

/** Size in bytes, or null if the file is missing. */
export async function sizeOfPrivate(key: string): Promise<number | null> {
  try {
    return (await stat(safePath(key))).size;
  } catch {
    return null;
  }
}

/** A stream of the file, or of one byte range of it, for seeking in video. */
export function readPrivate(key: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const node = createReadStream(safePath(key), range);
  return Readable.toWeb(node) as ReadableStream<Uint8Array>;
}

export class UploadError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Write a request body straight to disk as it arrives, rather than holding a
 * 100 MB video in memory. Checks the file type from its first bytes and stops
 * early if they are wrong. Refuses anything that ends short of the length the
 * browser declared, so a dropped connection cannot leave half a file behind.
 * On any failure the partial file is deleted.
 */
export async function streamToPrivate(
  key: string,
  body: ReadableStream<Uint8Array>,
  opts: { type: string; maxBytes: number; expectedBytes: number },
): Promise<number> {
  const path = safePath(key);
  await mkdir(dirname(path), { recursive: true });
  const out = createWriteStream(path, { flags: 'wx' });
  const reader = body.getReader();

  let size = 0;
  let head = new Uint8Array(0);
  let checked = false;
  const check = () => {
    checked = true;
    if (!bytesMatch(opts.type, head)) {
      throw new UploadError(415, 'This file does not look like what its name says it is.');
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > opts.maxBytes) throw new UploadError(413, 'This file is over the size limit.');
      if (!checked) {
        const joined = new Uint8Array(head.length + value.length);
        joined.set(head);
        joined.set(value, head.length);
        head = joined.subarray(0, 16);
        if (head.length >= 16) check();
      }
      if (!out.write(value)) await once(out, 'drain');
    }
    if (!checked) check();
    if (size !== opts.expectedBytes) {
      throw new UploadError(400, 'The upload stopped before the whole file arrived. Try again.');
    }
    out.end();
    await finished(out);
    return size;
  } catch (err) {
    await reader.cancel().catch(() => {});
    out.destroy();
    await rm(path, { force: true });
    throw err;
  }
}

/** Keys come from our own database, but never trust a path blindly. */
function safePath(key: string): string {
  const path = resolve(join(ROOT, key));
  if (!path.startsWith(ROOT + '/') && !path.startsWith(ROOT + '\\')) {
    throw new Error('Refusing a storage key outside the storage root.');
  }
  return path;
}

/** Kept for the application form; delegates to the shared byte checks. */
export async function sniffMatches(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return bytesMatch(file.type, head);
}
