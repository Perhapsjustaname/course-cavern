import 'server-only';

export const jsonError = (status: number, message: string) => Response.json({ ok: false, message }, { status });

/** The bytes the browser says it is sending. Proxies may rewrite Content-Length; this header they leave alone. */
export function declaredSize(req: Request): number {
  const n = Number(req.headers.get('x-file-size') ?? req.headers.get('content-length'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function cleanFileName(raw: string | null, fallback = 'file') {
  let name = fallback;
  try {
    name = raw ? decodeURIComponent(raw) : fallback;
  } catch {
    name = raw ?? fallback;
  }
  const base = name.split(/[\\/]/).pop() || fallback;
  return base.replace(/[\u0000-\u001f]/g, '').slice(0, 200);
}

/**
 * Serve a stored file, honouring a Range header so video and audio can seek
 * without downloading everything first.
 */
export function rangedResponse(
  req: Request,
  size: number,
  open: (range?: { start: number; end: number }) => ReadableStream<Uint8Array>,
  headers: Record<string, string>,
): Response {
  const base = { ...headers, 'Accept-Ranges': 'bytes' };
  const range = req.headers.get('range');
  if (!range) {
    return new Response(open(), { status: 200, headers: { ...base, 'Content-Length': String(size) } });
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = -1;
  let end = -1;
  if (m && (m[1] || m[2])) {
    if (m[1] === '') {
      // "bytes=-500" means the last 500 bytes.
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    } else {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    }
  }
  if (start < 0 || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${size}` } });
  }
  return new Response(open({ start, end }), {
    status: 206,
    headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
  });
}
