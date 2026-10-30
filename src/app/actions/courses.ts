'use server';

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PoolClient } from 'pg';
import { isUniqueViolation, query, queryOne, withTransaction } from '@/lib/db';
import { requireInstructor } from '@/lib/dal';
import { isUuid } from '@/lib/ids';
import { getOutline, getOwnedCourse, isEditable, readinessChecks, type CourseStatus } from '@/lib/courses';
import { isMediaKind } from '@/lib/media';
import { cleanRichText } from '@/lib/rich-text';
import { removePrivate } from '@/lib/storage';
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  courseDetailsSchema,
  courseSchema,
  fieldErrors,
  formText,
  lessonDetailsSchema,
  newLessonSchema,
  optionSchema,
  priceSchema,
  sectionSchema,
  type FieldErrors,
} from '@/lib/validation';

/**
 * Every action here is a public endpoint in disguise. IDs arrive bound from the
 * browser and can be changed, so each one re-checks that the course belongs to
 * the person asking and is in a state they are allowed to change.
 *
 * redirect() throws to do its job, so it is never called inside a try.
 */

export type FormState =
  | { errors?: FieldErrors; message?: string; ok?: boolean; id?: string }
  | undefined;

const LOCKED = 'This course is with a reviewer or already published, so it cannot be changed right now.';

// ------------------------------------------------------------------ guards --

type Owned = { course_id: string; status: CourseStatus };

async function ownedCourse(courseId: string, instructorId: string) {
  if (!isUuid(courseId)) return null;
  return queryOne<Owned>('SELECT id AS course_id, status FROM course WHERE id = $1 AND instructor_id = $2', [
    courseId,
    instructorId,
  ]);
}

async function ownedSection(sectionId: string, instructorId: string) {
  if (!isUuid(sectionId)) return null;
  return queryOne<Owned>(
    `SELECT s.course_id, c.status FROM section s JOIN course c ON c.id = s.course_id
      WHERE s.id = $1 AND c.instructor_id = $2`,
    [sectionId, instructorId],
  );
}

async function ownedLesson(lessonId: string, instructorId: string) {
  if (!isUuid(lessonId)) return null;
  return queryOne<Owned & { section_id: string; kind: string; content_key: string | null }>(
    `SELECT s.course_id, c.status, l.section_id, l.kind, l.content_key
       FROM lesson l JOIN section s ON s.id = l.section_id JOIN course c ON c.id = s.course_id
      WHERE l.id = $1 AND c.instructor_id = $2`,
    [lessonId, instructorId],
  );
}

function touch(courseId: string) {
  revalidatePath(`/instructor/courses/${courseId}`, 'layout');
  revalidatePath('/instructor');
}

async function bumpCourse(db: PoolClient | null, courseId: string) {
  const sql = 'UPDATE course SET updated_at = now() WHERE id = $1';
  if (db) await db.query(sql, [courseId]);
  else await query(sql, [courseId]);
}

/** Destructive actions re-check the password, not just the session. */
/** Null when the password is the user's own, otherwise what to tell them. */
async function checkPassword(userId: string, password: unknown): Promise<string | null> {
  if (typeof password !== 'string' || !password) return 'Enter your password to confirm.';
  const row = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  return row && (await bcrypt.compare(password, row.password_hash)) ? null : 'That password is not right.';
}

/**
 * Apply a complete new order. Refused unless it names exactly the rows that
 * are there, so a tampered list can neither drop a row nor pull one in from
 * someone else's course. Positions are deferrable, so the swaps are legal
 * mid-transaction.
 */
async function applyOrder(table: 'section' | 'lesson' | 'quiz_question', parentColumn: string, parentId: string, ids: unknown) {
  if (!Array.isArray(ids) || !ids.every(isUuid)) return false;
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string }>(`SELECT id FROM ${table} WHERE ${parentColumn} = $1`, [parentId]);
    const current = new Set(rows.map((r) => r.id));
    if (ids.length !== current.size || new Set(ids).size !== ids.length || !ids.every((id) => current.has(id))) {
      return false;
    }
    for (const [i, id] of ids.entries()) {
      await db.query(`UPDATE ${table} SET position = $2 WHERE id = $1`, [id, i + 1]);
    }
    return true;
  });
}

// ------------------------------------------------------------------ course --

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

export async function createCourse(_prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor('/instructor/courses/new');
  const parsed = courseSchema.omit({ description: true }).safeParse(formText(form, 'title', 'summary', 'industry', 'level', 'price'));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const c = parsed.data;

  let id: string | undefined;
  for (let attempt = 0; attempt < 3 && !id; attempt++) {
    try {
      const row = await queryOne<{ id: string }>(
        `INSERT INTO course (instructor_id, slug, title, summary, industry, level, price_cents)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [instructor.id, slugFor(c.title), c.title, c.summary, c.industry, c.level, Math.round(c.price * 100)],
      );
      id = row!.id;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err; // a slug collision; try a new suffix
    }
  }
  if (!id) return { message: 'Could not save the course. Try again.' };

  revalidatePath('/instructor');
  redirect(`/instructor/courses/${id}?created=1`);
}

export async function updateCourseDetails(courseId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned) return { message: 'Course not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const parsed = courseDetailsSchema.safeParse(formText(form, 'title', 'summary', 'industry', 'level'));
  const description = cleanRichText(form.get('description'), { max: 5000, label: 'description' });
  const errors: FieldErrors = parsed.success ? {} : fieldErrors(parsed.error);
  if (!description.ok) errors.description = [description.error];
  if (!parsed.success || !description.ok) return { errors };

  const c = parsed.data;
  await query(
    `UPDATE course SET title = $2, summary = $3, description = $4, industry = $5, level = $6, updated_at = now()
      WHERE id = $1`,
    [courseId, c.title, c.summary, description.html, c.industry, c.level],
  );
  touch(courseId);
  return { ok: true, message: 'Saved.' };
}

export async function updateCoursePrice(courseId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned) return { message: 'Course not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const parsed = priceSchema.safeParse(formText(form, 'price'));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await query('UPDATE course SET price_cents = $2, updated_at = now() WHERE id = $1', [
    courseId,
    Math.round(parsed.data.price * 100),
  ]);
  touch(courseId);
  return { ok: true, message: 'Saved.' };
}

export async function removeThumbnail(courseId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned || !isEditable(owned.status)) return;
  const old = await queryOne<{ thumbnail_key: string | null }>('SELECT thumbnail_key FROM course WHERE id = $1', [courseId]);
  await query('UPDATE course SET thumbnail_key = NULL, updated_at = now() WHERE id = $1', [courseId]);
  await removePrivate(old?.thumbnail_key);
  touch(courseId);
}

export async function deleteCourse(courseId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { user, instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned) return { message: 'Course not found.' };
  // Published courses may have students. They are never deleted from here.
  if (!isEditable(owned.status)) return { message: 'Only drafts can be deleted. Unpublish it first.' };
  const wrong = await checkPassword(user.id, form.get('password'));
  if (wrong) return { errors: { password: [wrong] } };

  const files = await withTransaction(async (db) => {
    const { rows } = await db.query<{ key: string }>(
      `SELECT l.content_key AS key FROM lesson l JOIN section s ON s.id = l.section_id
        WHERE s.course_id = $1 AND l.content_key IS NOT NULL
       UNION ALL
       SELECT thumbnail_key FROM course WHERE id = $1 AND thumbnail_key IS NOT NULL`,
      [courseId],
    );
    // Checked again here in case it was sent for review a moment ago.
    const gone = await db.query("DELETE FROM course WHERE id = $1 AND status IN ('draft', 'changes_requested')", [courseId]);
    return gone.rowCount === 1 ? rows : null;
  });
  if (!files) return { message: 'Only drafts can be deleted. Unpublish it first.' };
  // Rows are gone, so the files have nothing pointing at them.
  await Promise.all(files.map((f) => removePrivate(f.key).catch(() => {})));

  revalidatePath('/instructor');
  redirect('/instructor?deleted=1');
}

export async function unpublishCourse(courseId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { user, instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned) return { message: 'Course not found.' };
  if (owned.status !== 'published') return { message: 'This course is not published.' };
  const wrong = await checkPassword(user.id, form.get('password'));
  if (wrong) return { errors: { password: [wrong] } };
  const moved = await queryOne<{ id: string }>(
    "UPDATE course SET status = 'draft', submitted_at = NULL, updated_at = now() WHERE id = $1 AND status = 'published' RETURNING id",
    [courseId],
  );
  if (!moved) return { message: 'This course is not published.' };
  touch(courseId);
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function submitCourse(courseId: string, _prev: FormState): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const course = isUuid(courseId) ? await getOwnedCourse(courseId, instructor.id) : null;
  if (!course) return { message: 'Course not found.' };
  if (!isEditable(course.status)) return { message: 'This course is already with a reviewer or published.' };

  // Status re-read from the database rather than trusting anything cached.
  const approved = await queryOne<{ ok: boolean }>(
    "SELECT status = 'approved' AS ok FROM instructor_profile WHERE id = $1",
    [instructor.id],
  );
  const failing = readinessChecks(course, await getOutline(courseId), Boolean(approved?.ok)).filter((c) => !c.done);
  if (failing.length) return { message: `Not ready yet: ${failing[0]!.label.toLowerCase()}. ${failing[0]!.hint ?? ''}`.trim() };

  const sent = await queryOne<{ id: string }>(
    `UPDATE course SET status = 'in_review', submitted_at = now(), updated_at = now()
     WHERE id = $1 AND status IN ('draft', 'changes_requested') RETURNING id`,
    [courseId],
  );
  if (!sent) return { message: 'This course is already with a reviewer or published.' };
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

// ---------------------------------------------------------------- sections --

function readSection(form: FormData) {
  const parsed = sectionSchema.safeParse(formText(form, 'title'));
  const description = cleanRichText(form.get('description'), { max: 1000, label: 'section description' });
  const errors: FieldErrors = parsed.success ? {} : fieldErrors(parsed.error);
  if (!description.ok) errors.description = [description.error];
  return parsed.success && description.ok
    ? { ok: true as const, title: parsed.data.title, description: description.html }
    : { ok: false as const, errors };
}

export async function addSection(courseId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned) return { message: 'Course not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const s = readSection(form);
  if (!s.ok) return { errors: s.errors };
  const row = await queryOne<{ id: string }>(
    `INSERT INTO section (course_id, title, description, position)
     VALUES ($1, $2, $3, (SELECT coalesce(max(position), 0) + 1 FROM section WHERE course_id = $1))
     RETURNING id`,
    [courseId, s.title, s.description],
  );
  await bumpCourse(null, courseId);
  touch(courseId);
  return { ok: true, id: row!.id };
}

export async function updateSection(sectionId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedSection(sectionId, instructor.id);
  if (!owned) return { message: 'Section not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const s = readSection(form);
  if (!s.ok) return { errors: s.errors };
  await query('UPDATE section SET title = $2, description = $3, updated_at = now() WHERE id = $1', [
    sectionId,
    s.title,
    s.description,
  ]);
  await bumpCourse(null, owned.course_id);
  touch(owned.course_id);
  return { ok: true };
}

export async function deleteSection(sectionId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedSection(sectionId, instructor.id);
  if (!owned || !isEditable(owned.status)) return;
  const files = await query<{ content_key: string }>(
    'SELECT content_key FROM lesson WHERE section_id = $1 AND content_key IS NOT NULL',
    [sectionId],
  );
  await query('DELETE FROM section WHERE id = $1', [sectionId]);
  await Promise.all(files.map((f) => removePrivate(f.content_key).catch(() => {})));
  await bumpCourse(null, owned.course_id);
  touch(owned.course_id);
}

export async function reorderSections(courseId: string, ids: string[]): Promise<boolean> {
  const { instructor } = await requireInstructor();
  const owned = await ownedCourse(courseId, instructor.id);
  if (!owned || !isEditable(owned.status)) return false;
  const ok = await applyOrder('section', 'course_id', courseId, ids);
  if (ok) {
    await bumpCourse(null, courseId);
    touch(courseId);
  }
  return ok;
}

// ----------------------------------------------------------------- lessons --

export async function addLesson(sectionId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedSection(sectionId, instructor.id);
  if (!owned) return { message: 'Section not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const parsed = newLessonSchema.safeParse(formText(form, 'title', 'kind'));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { title, kind } = parsed.data;

  const row = await queryOne<{ id: string }>(
    `INSERT INTO lesson (section_id, title, kind, pass_percent, position)
     VALUES ($1, $2, $3, $4, (SELECT coalesce(max(position), 0) + 1 FROM lesson WHERE section_id = $1))
     RETURNING id`,
    [sectionId, title, kind, kind === 'quiz' ? 80 : null],
  );
  await bumpCourse(null, owned.course_id);
  touch(owned.course_id);
  return { ok: true, id: row!.id };
}

export async function updateLesson(lessonId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned) return { message: 'Lesson not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const parsed = lessonDetailsSchema.safeParse({
    ...formText(form, 'title', 'sectionId', 'durationMinutes', 'passPercent'),
    isPreview: form.get('isPreview') ?? '',
  });
  const description = cleanRichText(form.get('description'), { max: 2000, label: 'lesson description' });
  const errors: FieldErrors = parsed.success ? {} : fieldErrors(parsed.error);
  if (!description.ok) errors.description = [description.error];
  if (owned.kind === 'quiz' && parsed.success && parsed.data.passPercent === undefined) {
    errors.passPercent = ['Set a pass mark, from 0 to 100.'];
  }
  if (!parsed.success || !description.ok || Object.keys(errors).length) return { errors };
  const l = parsed.data;

  // Moving between sections: the target must be in the same course.
  let targetSection = owned.section_id;
  if (l.sectionId !== owned.section_id) {
    const target = await queryOne<{ id: string }>('SELECT id FROM section WHERE id = $1 AND course_id = $2', [
      l.sectionId,
      owned.course_id,
    ]);
    if (!target) return { errors: { sectionId: ['That section is not in this course.'] } };
    targetSection = target.id;
  }

  await withTransaction(async (db) => {
    await db.query(
      `UPDATE lesson
          SET title = $2, description = $3, is_preview = $4, duration_minutes = $5,
              pass_percent = $6, updated_at = now()
        WHERE id = $1`,
      [lessonId, l.title, description.html, l.isPreview, l.durationMinutes ?? null, owned.kind === 'quiz' ? l.passPercent : null],
    );
    if (targetSection !== owned.section_id) {
      await db.query(
        `UPDATE lesson SET section_id = $2,
                position = (SELECT coalesce(max(position), 0) + 1 FROM lesson WHERE section_id = $2)
          WHERE id = $1`,
        [lessonId, targetSection],
      );
    }
    await bumpCourse(db, owned.course_id);
  });
  touch(owned.course_id);
  return { ok: true, message: targetSection !== owned.section_id ? 'Saved and moved.' : 'Saved.' };
}

/** A reading lesson's text, saved on its own so a long edit is never blocked by the other fields. */
export async function saveReading(lessonId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned || owned.kind !== 'text') return { message: 'Lesson not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const body = cleanRichText(form.get('body'), { max: 50_000, label: 'reading' });
  if (!body.ok) return { errors: { body: [body.error] } };
  await query('UPDATE lesson SET body = $2, updated_at = now() WHERE id = $1', [lessonId, body.html]);
  await bumpCourse(null, owned.course_id);
  touch(owned.course_id);
  return { ok: true, message: body.html ? 'Saved.' : 'Saved. The reading is empty, so this lesson still needs content.' };
}

export async function deleteLesson(lessonId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned || !isEditable(owned.status)) return;
  await query('DELETE FROM lesson WHERE id = $1', [lessonId]);
  await removePrivate(owned.content_key).catch(() => {});
  await bumpCourse(null, owned.course_id);
  touch(owned.course_id);
}

/** Delete and go back to the curriculum, for the lesson editor page. */
export async function deleteLessonAndReturn(lessonId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  await deleteLesson(lessonId);
  redirect(owned ? `/instructor/courses/${owned.course_id}` : '/instructor');
}

export async function reorderLessons(sectionId: string, ids: string[]): Promise<boolean> {
  const { instructor } = await requireInstructor();
  const owned = await ownedSection(sectionId, instructor.id);
  if (!owned || !isEditable(owned.status)) return false;
  const ok = await applyOrder('lesson', 'section_id', sectionId, ids);
  if (ok) {
    await bumpCourse(null, owned.course_id);
    touch(owned.course_id);
  }
  return ok;
}

export async function removeLessonMedia(lessonId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned || !isEditable(owned.status) || !isMediaKind(owned.kind)) return;
  await query(
    `UPDATE lesson SET content_key = NULL, file_name = NULL, mime_type = NULL, size_bytes = NULL, updated_at = now()
      WHERE id = $1`,
    [lessonId],
  );
  await removePrivate(owned.content_key).catch(() => {});
  await bumpCourse(null, owned.course_id);
  touch(owned.course_id);
}

// -------------------------------------------------------------------- quiz --

/** Create a question (questionId null) or replace one, options and all. */
export async function saveQuestion(
  lessonId: string,
  questionId: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned || owned.kind !== 'quiz') return { message: 'Quiz not found.' };
  if (!isEditable(owned.status)) return { message: LOCKED };

  const errors: FieldErrors = {};
  const prompt = cleanRichText(form.get('prompt'), { max: 1000, required: true, label: 'question' });
  if (!prompt.ok) errors.prompt = [prompt.error];

  // Options arrive as option.<row>.text / option.<row>.explanation, plus one
  // "correct" naming the row that is right.
  const correctRow = Number(form.get('correct'));
  const blank = (key: string) => !String(form.get(key) ?? '').trim();
  const rows = [...new Set([...form.keys()].map((k) => k.match(/^option\.(\d+)\.text$/)?.[1]).filter(Boolean))]
    .map(Number)
    // The form starts with four rows. Ones left empty were not needed, so skip
    // them, unless it is the row marked right, which then gets an error.
    .filter((row) => row === correctRow || !blank(`option.${row}.text`) || !blank(`option.${row}.explanation`));
  rows.sort((a, b) => a - b);
  if (rows.length < MIN_OPTIONS) errors.options = [`Give at least ${MIN_OPTIONS} answers to choose from.`];
  if (rows.length > MAX_OPTIONS) errors.options = [`Keep it to ${MAX_OPTIONS} answers or fewer.`];

  const options: { text: string; explanation?: string; correct: boolean }[] = [];
  for (const row of rows) {
    const parsed = optionSchema.safeParse({
      text: form.get(`option.${row}.text`) ?? '',
      explanation: form.get(`option.${row}.explanation`) ?? '',
    });
    if (!parsed.success) {
      const e = fieldErrors(parsed.error);
      if (e.text) errors[`option.${row}.text`] = e.text;
      if (e.explanation) errors[`option.${row}.explanation`] = e.explanation;
      continue;
    }
    options.push({ ...parsed.data, correct: row === correctRow });
  }
  if (!rows.includes(correctRow)) errors.correct = ['Mark which answer is right.'];
  if (Object.keys(errors).length || !prompt.ok) return { errors, message: 'Some of this needs fixing before it can be saved.' };

  const saved = await withTransaction(async (db) => {
    let id = questionId;
    if (id) {
      if (!isUuid(id)) return null;
      const updated = await db.query('UPDATE quiz_question SET prompt = $3, updated_at = now() WHERE id = $1 AND lesson_id = $2', [
        id,
        lessonId,
        prompt.html,
      ]);
      if (updated.rowCount !== 1) return null;
      await db.query('DELETE FROM quiz_option WHERE question_id = $1', [id]);
    } else {
      const { rows: inserted } = await db.query<{ id: string }>(
        `INSERT INTO quiz_question (lesson_id, prompt, position)
         VALUES ($1, $2, (SELECT coalesce(max(position), 0) + 1 FROM quiz_question WHERE lesson_id = $1))
         RETURNING id`,
        [lessonId, prompt.html],
      );
      id = inserted[0]!.id;
    }
    for (const [i, o] of options.entries()) {
      await db.query(
        'INSERT INTO quiz_option (question_id, text, is_correct, explanation, position) VALUES ($1, $2, $3, $4, $5)',
        [id, o.text, o.correct, o.explanation ?? null, i + 1],
      );
    }
    await db.query('UPDATE lesson SET updated_at = now() WHERE id = $1', [lessonId]);
    await bumpCourse(db, owned.course_id);
    return id;
  });
  if (!saved) return { message: 'That question no longer exists.' };

  touch(owned.course_id);
  return { ok: true, id: saved };
}

export async function deleteQuestion(lessonId: string, questionId: string) {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned || owned.kind !== 'quiz' || !isEditable(owned.status) || !isUuid(questionId)) return;
  await query('DELETE FROM quiz_question WHERE id = $1 AND lesson_id = $2', [questionId, lessonId]);
  await bumpCourse(null, owned.course_id);
  touch(owned.course_id);
}

export async function reorderQuestions(lessonId: string, ids: string[]): Promise<boolean> {
  const { instructor } = await requireInstructor();
  const owned = await ownedLesson(lessonId, instructor.id);
  if (!owned || owned.kind !== 'quiz' || !isEditable(owned.status)) return false;
  const ok = await applyOrder('quiz_question', 'lesson_id', lessonId, ids);
  if (ok) touch(owned.course_id);
  return ok;
}
