'use client';

/**
 * Upload a file with progress. fetch() cannot report upload progress, so this
 * uses XMLHttpRequest. Every outcome settles the promise, so a caller's
 * spinner can always stop: success, a refusal from the server, a dropped
 * connection, or a cancel.
 */
export type UploadResult = { ok: true; data: Record<string, unknown> } | { ok: false; message: string; cancelled?: boolean };

export function uploadFile(
  url: string,
  file: Blob,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
): { promise: Promise<UploadResult>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<UploadResult>((resolve) => {
    xhr.open('POST', url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    // The real size, in a header proxies leave alone (they may rewrite Content-Length).
    xhr.setRequestHeader('X-File-Size', String(file.size));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // A proxy or crash page instead of our JSON.
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve({ ok: true, data: body });
      else if (xhr.status === 413 && !body.message) resolve({ ok: false, message: 'That file is too big to upload.' });
      else resolve({ ok: false, message: (body.message as string) ?? `The upload failed (error ${xhr.status}). Try again.` });
    };
    xhr.onerror = () => resolve({ ok: false, message: 'The connection dropped during the upload. Try again.' });
    xhr.onabort = () => resolve({ ok: false, message: 'Upload cancelled.', cancelled: true });
    xhr.send(file);
  });
  return { promise, cancel: () => xhr.abort() };
}

/** Read the first bytes of a file, to check its type before uploading. */
export async function fileHead(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, 16).arrayBuffer());
}
