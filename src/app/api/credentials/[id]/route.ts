import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/dal';
import { getPrivate } from '@/lib/storage';
import { isUuid } from '@/lib/ids';

/**
 * The only way to read an uploaded credential. Its owner and admins may see it;
 * everyone else gets a 404, so the route does not even confirm it exists.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = () => new Response('Not found', { status: 404 });
  if (!isUuid(id)) return notFound();

  const user = await getCurrentUser();
  if (!user) return new Response('Sign in to view this document.', { status: 401 });

  const doc = await queryOne<{ document_key: string; file_name: string; mime_type: string; owner_id: string }>(
    `SELECT c.document_key, c.file_name, c.mime_type, p.user_id AS owner_id
       FROM credential c JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE c.id = $1`,
    [id],
  );
  if (!doc) return notFound();
  if (user.role !== 'admin' && doc.owner_id !== user.id) return notFound();

  let body: Buffer;
  try {
    body = await getPrivate(doc.document_key);
  } catch {
    return new Response('The file for this document is missing from storage.', { status: 410 });
  }

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': doc.mime_type,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
      'Content-Length': String(body.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      // A document should never be able to run anything in our origin.
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
