import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/dal';
import { isUuid } from '@/lib/ids';
import { isEditable, type CourseStatus } from '@/lib/courses';
import { THUMBNAIL_MAX_BYTES, THUMBNAIL_TYPES, canonicalType, formatLimit } from '@/lib/media';
import { UploadError, readPrivate, removePrivate, sizeOfPrivate, streamToPrivate } from '@/lib/storage';
import { declaredSize, jsonError, rangedResponse } from '@/lib/http';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError(404, 'Course not found.');
  const user = await getCurrentUser();
  if (!user) return jsonError(401, 'Your session ended. Sign in again, then retry.');
  if (!user.instructor) return jsonError(404, 'Course not found.');

  const course = await queryOne<{ thumbnail_key: string | null; status: CourseStatus }>(
    'SELECT thumbnail_key, status FROM course WHERE id = $1 AND instructor_id = $2',
    [id, user.instructor.id],
  );
  if (!course) return jsonError(404, 'Course not found.');
  if (!isEditable(course.status)) return jsonError(409, 'This course is with a reviewer or published, so it cannot be changed.');

  const type = canonicalType(req.headers.get('content-type'));
  const ext = THUMBNAIL_TYPES[type];
  if (!ext) return jsonError(415, 'Use a JPG, PNG or WebP image.');
  const size = declaredSize(req);
  if (!size) return jsonError(411, 'The upload did not say how big the image is. Try again.');
  if (size > THUMBNAIL_MAX_BYTES) return jsonError(413, `Images can be up to ${formatLimit(THUMBNAIL_MAX_BYTES)}.`);
  if (!req.body) return jsonError(400, 'No image arrived.');

  const key = `thumbnails/${id}/${randomUUID()}.${ext}`;
  try {
    await streamToPrivate(key, req.body, { type, maxBytes: THUMBNAIL_MAX_BYTES, expectedBytes: size });
  } catch (err) {
    if (err instanceof UploadError) return jsonError(err.status, err.message);
    throw err;
  }

  await query('UPDATE course SET thumbnail_key = $2, updated_at = now() WHERE id = $1', [id, key]);
  await removePrivate(course.thumbnail_key).catch(() => {});
  revalidatePath(`/instructor/courses/${id}`, 'layout');
  revalidatePath('/instructor');
  return Response.json({ ok: true });
}

/** Public once the course is published; until then, its instructor and reviewers. */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError(404, 'Not found.');
  const row = await queryOne<{ thumbnail_key: string | null; status: CourseStatus; owner_id: string }>(
    `SELECT c.thumbnail_key, c.status, p.user_id AS owner_id
       FROM course c JOIN instructor_profile p ON p.id = c.instructor_id WHERE c.id = $1`,
    [id],
  );
  if (!row?.thumbnail_key) return jsonError(404, 'Not found.');

  const isPublic = row.status === 'published';
  if (!isPublic) {
    const user = await getCurrentUser();
    const allowed = user && (user.id === row.owner_id || (user.role === 'admin' && row.status !== 'draft'));
    if (!allowed) return jsonError(404, 'Not found.');
  }

  const size = await sizeOfPrivate(row.thumbnail_key);
  if (size === null) return jsonError(404, 'Not found.');
  const key = row.thumbnail_key;
  const ext = key.split('.').pop() ?? '';
  const type = Object.entries(THUMBNAIL_TYPES).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
  return rangedResponse(req, size, (range) => readPrivate(key, range), {
    'Content-Type': type,
    // The URL carries ?v=<when it last changed>, so a new image gets a new URL.
    'Cache-Control': isPublic ? 'public, max-age=86400, immutable' : 'private, max-age=60',
    'X-Content-Type-Options': 'nosniff',
  });
}
