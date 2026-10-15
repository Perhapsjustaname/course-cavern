'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isUniqueViolation, query, queryOne, withTransaction } from '@/lib/db';
import { requireInstructor } from '@/lib/dal';
import { isUuid } from '@/lib/ids';
import { isEditable, type CourseStatus } from '@/lib/courses';
import {
  courseSchema,
  fieldErrors,
  formText,
  lessonSchema,
  sectionSchema,
  type FieldErrors,
} from '@/lib/validation';

/**
 * Every action here is a public endpoint in disguise. IDs arrive bound from the
 * browser and can be changed, so each one re-checks that the course belongs to
 * the person asking and is in a state they are allowed to change.
 */

export type FormState =
  | { errors?: FieldErrors; message?: string; ok?: boolean; values?: Record<string, string> }
  | undefined;

const LOCKED = 'This course is with a reviewer or already published, so it cannot be changed right now.';

type Owned = { course_id: string; status: CourseStatus };

async function ownedCourse(courseId: string, instructorId: string) {
  if (!isUuid(courseId)) return null;
  return queryOne<Owned>(
    'SELECT id AS course_id, status FROM course WHERE id = $1 AND instructor_id = $2',
    [courseId, instructorId],
  );
}

async function ownedSection(sectionId: string, instructorId: string) {
  if (!isUuid(sectionId)) return null;
  return queryOne<Owned & { position: number }>(
    `SELECT s.course_id, c.status, s.position
       FROM section s JOIN course c ON c.id = s.course_id
      WHERE s.id = $1 AND c.instructor_id = $2`,
    [sectionId, instructorId],
  );
}

async function ownedLesson(lessonId: string, instructorId: string) {
  if (!isUuid(lessonId)) return null;
  return queryOne<Owned & { section_id: string; position: number }>(
    `SELECT s.course_id, c.status, l.section_id, l.position
       FROM lesson l
       JOIN section s ON s.id = l.section_id
       JOIN course c ON c.id = s.course_id
      WHERE l.id = $1 AND c.instructor_id = $2`,
    [lessonId, instructorId],
  );
}

function touch(courseId: string) {
  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath('/instructor');
}

async function bumpUpdated(courseId: string) {
  await query('UPDATE course SET updated_at = now() WHERE id = $1', [courseId]);
}

function slugFor(title: string) {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'course'}-${randomBytes(4).toString('hex').slice(0, 6)}`;
}

// ---------------------------------------------------------------- details --

const DETAIL_FIELDS = ['title', 'summary', 'description', 'industry', 'level', 'price'] as const;

export async function createCourse(_prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor('/instructor/courses/new');
  const raw = formText(form, ...DETAIL_FIELDS);
  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const c = parsed.data;

  let id: string | undefined;
  for (let attempt = 0; attempt < 3 && !id; attempt++) {
    try {
      const row = await queryOne<{ id: string }>(
        `INSERT INTO course (instructor_id, slug, title, summary, description, industry, level, price_cents)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [instructor.id, slugFor(c.title), c.title, c.summary, c.description ?? null, c.industry, c.level, Math.round(c.price * 100)],
      );
      id = row!.id;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err; // a slug collision; try a new suffix
    }
  }
  if (!id) return { message: 'Could not save the course. Try again.', values: raw };

  revalidatePath('/instructor');
  redirect(`/instructor/courses/${id}?created=1`);
}

export async function updateCourse(courseId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned) return { message: 'Course not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const raw = formText(form, ...DETAIL_FIELDS);
  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const c = parsed.data;

  await query(
    `UPDATE course
        SET title = $2, summary = $3, description = $4, industry = $5, level = $6,
            price_cents = $7, updated_at = now()
      WHERE id = $1`,
    [courseId, c.title, c.summary, c.description ?? null, c.industry, c.level, Math.round(c.price * 100)],
  );
  touch(courseId);
  return { ok: true, message: 'Saved.' };
}

export async function deleteCourse(courseId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  // Published courses may have students. They are never deleted from here.
  if (!owned || !isEditable(owned.status)) return;
  await query('DELETE FROM course WHERE id = $1', [courseId]);
  revalidatePath('/instructor');
  redirect('/instructor');
}

// --------------------------------------------------------------- sections --

export async function addSection(courseId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned) return { message: 'Course not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const raw = formText(form, 'title');
  const parsed = sectionSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  await query(
    `INSERT INTO section (course_id, title, position)
     VALUES ($1, $2, (SELECT coalesce(max(position), 0) + 1 FROM section WHERE course_id = $1))`,
    [courseId, parsed.data.title],
  );
  await bumpUpdated(courseId);
  touch(courseId);
  return { ok: true };
}

export async function renameSection(sectionId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedSection(sectionId, instructor.id);
  if (!owned) return { message: 'Section not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const raw = formText(form, 'title');
  const parsed = sectionSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  await query('UPDATE section SET title = $2 WHERE id = $1', [sectionId, parsed.data.title]);
  await bumpUpdated(owned.course_id);
  touch(owned.course_id);
  return { ok: true };
}

export async function deleteSection(sectionId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedSection(sectionId, instructor.id);
  if (!owned || !isEditable(owned.status)) return;
  await query('DELETE FROM section WHERE id = $1', [sectionId]);
  await bumpUpdated(owned.course_id);
  touch(owned.course_id);
}

export async function moveSection(sectionId: string, direction: 'up' | 'down') {
  const { instructor } = await requireInstructor();
  const owned = await ownedSection(sectionId, instructor.id);
  if (!owned || !isEditable(owned.status)) return;

  const neighbour = await queryOne<{ id: string; position: number }>(
    direction === 'up'
      ? 'SELECT id, position FROM section WHERE course_id = $1 AND position < $2 ORDER BY position DESC LIMIT 1'
      : 'SELECT id, position FROM section WHERE course_id = $1 AND position > $2 ORDER BY position ASC LIMIT 1',
    [owned.course_id, owned.position],
  );
  if (!neighbour) return;

  // The unique (course_id, position) check is deferred, so the swap is legal
  // even though both rows briefly hold the same position mid-transaction.
  await withTransaction(async (db) => {
    await db.query('UPDATE section SET position = $2 WHERE id = $1', [sectionId, neighbour.position]);
    await db.query('UPDATE section SET position = $2 WHERE id = $1', [neighbour.id, owned.position]);
  });
  await bumpUpdated(owned.course_id);
  touch(owned.course_id);
}

// ---------------------------------------------------------------- lessons --

const LESSON_FIELDS = ['title', 'kind', 'durationMinutes'] as const;

export async function addLesson(sectionId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedSection(sectionId, instructor.id);
  if (!owned) return { message: 'Section not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const raw = formText(form, ...LESSON_FIELDS);
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const l = parsed.data;

  await query(
    `INSERT INTO lesson (section_id, title, kind, duration_minutes, position)
     VALUES ($1, $2, $3, $4, (SELECT coalesce(max(position), 0) + 1 FROM lesson WHERE section_id = $1))`,
    [sectionId, l.title, l.kind, l.durationMinutes ?? null],
  );
  await bumpUpdated(owned.course_id);
  touch(owned.course_id);
  // Keep the chosen type so adding several videos in a row is quick.
  return { ok: true, values: { kind: l.kind } };
}

export async function updateLesson(lessonId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned) return { message: 'Lesson not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const raw = formText(form, ...LESSON_FIELDS);
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const l = parsed.data;

  await query('UPDATE lesson SET title = $2, kind = $3, duration_minutes = $4 WHERE id = $1', [
    lessonId,
    l.title,
    l.kind,
    l.durationMinutes ?? null,
  ]);
  await bumpUpdated(owned.course_id);
  touch(owned.course_id);
  return { ok: true };
}

export async function deleteLesson(lessonId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned || !isEditable(owned.status)) return;
  await query('DELETE FROM lesson WHERE id = $1', [lessonId]);
  await bumpUpdated(owned.course_id);
  touch(owned.course_id);
}

export async function moveLesson(lessonId: string, direction: 'up' | 'down') {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned || !isEditable(owned.status)) return;

  const neighbour = await queryOne<{ id: string; position: number }>(
    direction === 'up'
      ? 'SELECT id, position FROM lesson WHERE section_id = $1 AND position < $2 ORDER BY position DESC LIMIT 1'
      : 'SELECT id, position FROM lesson WHERE section_id = $1 AND position > $2 ORDER BY position ASC LIMIT 1',
    [owned.section_id, owned.position],
  );
  if (!neighbour) return;

  await withTransaction(async (db) => {
    await db.query('UPDATE lesson SET position = $2 WHERE id = $1', [lessonId, neighbour.position]);
    await db.query('UPDATE lesson SET position = $2 WHERE id = $1', [neighbour.id, owned.position]);
  });
  await bumpUpdated(owned.course_id);
  touch(owned.course_id);
}

// ----------------------------------------------------------------- review --

export async function submitCourse(courseId: string, _prev: FormState): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned) return { message: 'Course not found.' };
  if (!isEditable(owned.status)) return { message: 'This course is already with a reviewer or published.' };

  // Re-read status from the database rather than trusting anything cached.
  const approved = await queryOne<{ ok: boolean }>(
    "SELECT status = 'approved' AS ok FROM instructor_profile WHERE id = $1",
    [instructor.id],
  );
  if (!approved?.ok) {
    return { message: 'Courses can go to review once your own application is approved.' };
  }

  const shape = await queryOne<{ sections: number; empty_sections: number }>(
    `SELECT count(*)::int AS sections,
            count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM lesson l WHERE l.section_id = s.id))::int AS empty_sections
       FROM section s WHERE s.course_id = $1`,
    [courseId],
  );
  if (!shape || shape.sections === 0) return { message: 'Add at least one section with a lesson in it first.' };
  if (shape.empty_sections > 0) {
    return { message: 'Every section needs at least one lesson. Fill or remove the empty ones.' };
  }

  await query(
    "UPDATE course SET status = 'in_review', submitted_at = now(), updated_at = now() WHERE id = $1",
    [courseId],
  );
  touch(courseId);
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function withdrawCourse(courseId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned || owned.status !== 'in_review') return;
  await query("UPDATE course SET status = 'draft', submitted_at = NULL, updated_at = now() WHERE id = $1", [courseId]);
  touch(courseId);
  revalidatePath('/admin', 'layout');
}
