import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/dal';
import { isUuid } from '@/lib/ids';
import { isEditable, type CourseStatus } from '@/lib/courses';
import { LESSON_MAX_BYTES, MEDIA_RULES, canonicalType, formatLimit, isMediaKind } from '@/lib/media';
import { UploadError, readPrivate, removePrivate, sizeOfPrivate, streamToPrivate } from '@/lib/storage';
import { cleanFileName, declaredSize, jsonError, rangedResponse } from '@/lib/http';

type Params = { params: Promise<{ id: string }> };

/**
 * Upload a lesson's video, audio or PDF. The body is the raw file, streamed to
 * storage as it arrives. This lives under /api on purpose: proxy never runs
 * here, and proxy would cut any body over 10 MB short.
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError(404, 'Lesson not found.');
  const user = await getCurrentUser();
  if (!user) return jsonError(401, 'Your session ended. Sign in again, then retry the upload.');
  if (!user.instructor) return jsonError(404, 'Lesson not found.');

  const lesson = await queryOne<{ kind: string; content_key: string | null; course_id: string; status: CourseStatus }>(
    `SELECT l.kind, l.content_key, s.course_id, c.status
       FROM lesson l JOIN section s ON s.id = l.section_id JOIN course c ON c.id = s.course_id
      WHERE l.id = $1 AND c.instructor_id = $2`,
    [id, user.instructor.id],
  );
  if (!lesson) return jsonError(404, 'Lesson not found.');
  if (!isEditable(lesson.status)) return jsonError(409, 'This course is with a reviewer or published, so it cannot be changed.');
  if (!isMediaKind(lesson.kind)) return jsonError(400, 'This kind of lesson does not take a file.');

  const rule = MEDIA_RULES[lesson.kind];
  const fileName = cleanFileName(req.headers.get('x-file-name'));
  const type = canonicalType(req.headers.get('content-type'), fileName);
  const ext = rule.types[type];
  if (!ext) return jsonError(415, `That file type will not work here. ${rule.hint}`);
  const size = declaredSize(req);
  if (!size) return jsonError(411, 'The upload did not say how big the file is. Try again.');
  if (size > LESSON_MAX_BYTES) return jsonError(413, `This file is over the ${formatLimit(LESSON_MAX_BYTES)} limit.`);
  if (!req.body) return jsonError(400, 'No file arrived.');

  const key = `lessons/${user.id}/${randomUUID()}.${ext}`;
  try {
    await streamToPrivate(key, req.body, { type, maxBytes: LESSON_MAX_BYTES, expectedBytes: size });
  } catch (err) {
    if (err instanceof UploadError) return jsonError(err.status, err.message);
    throw err;
  }

  // Read by the browser from the file's own metadata before uploading.
  const seconds = Number(req.headers.get('x-duration-seconds'));
  const minutes = Number.isFinite(seconds) && seconds > 0 ? Math.min(600, Math.max(1, Math.ceil(seconds / 60))) : null;

  // Swap the new file in only if nobody else replaced it meanwhile.
  const swapped = await query(
    `UPDATE lesson
        SET content_key = $2, file_name = $3, mime_type = $4, size_bytes = $5,
            duration_minutes = coalesce($6, duration_minutes), updated_at = now()
      WHERE id = $1 AND content_key IS NOT DISTINCT FROM $7
      RETURNING id`,
    [id, key, fileName, type, size, minutes, lesson.content_key],
  );
  if (!swapped.length) {
    await removePrivate(key);
    return jsonError(409, 'This lesson changed while the file was uploading. Refresh and try again.');
  }
  await removePrivate(lesson.content_key).catch(() => {});
  await query('UPDATE course SET updated_at = now() WHERE id = $1', [lesson.course_id]);
  revalidatePath(`/instructor/courses/${lesson.course_id}`, 'layout');

  return Response.json({ ok: true, fileName, sizeBytes: size, mimeType: type, durationMinutes: minutes });
}

/**
 * Play or download a lesson's file. Its instructor can always see it; admins
 * once the course has been sent for review. Drafts stay private.
 */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError(404, 'Not found.');
  const user = await getCurrentUser();
  if (!user) return jsonError(401, 'Sign in to see this.');

  const row = await queryOne<{ content_key: string | null; mime_type: string | null; file_name: string | null; owner_id: string; status: CourseStatus }>(
    `SELECT l.content_key, l.mime_type, l.file_name, p.user_id AS owner_id, c.status
       FROM lesson l JOIN section s ON s.id = l.section_id JOIN course c ON c.id = s.course_id
       JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE l.id = $1`,
    [id],
  );
  const allowed = row && (row.owner_id === user.id || (user.role === 'admin' && row.status !== 'draft'));
  if (!row || !allowed || !row.content_key) return jsonError(404, 'Not found.');

  const size = await sizeOfPrivate(row.content_key);
  if (size === null) return jsonError(410, 'The file for this lesson is missing from storage.');

  const key = row.content_key;
  return rangedResponse(req, size, (range) => readPrivate(key, range), {
    'Content-Type': row.mime_type ?? 'application/octet-stream',
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.file_name ?? 'file')}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
}
