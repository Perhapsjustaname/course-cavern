import 'server-only';
import { cache } from 'react';
import { query, queryOne } from '@/lib/db';
import { lessonHasContent, type LessonKind } from '@/lib/lessons';

export { lessonHasContent, MISSING_CONTENT } from '@/lib/lessons';

export type CourseStatus = 'draft' | 'in_review' | 'changes_requested' | 'published';
export type { LessonKind };

export type Course = {
  id: string;
  instructor_id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  industry: string | null;
  level: 'beginner' | 'intermediate' | 'advanced' | null;
  price_cents: number;
  currency: string;
  status: CourseStatus;
  thumbnail_key: string | null;
  submitted_at: Date | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type Lesson = {
  id: string;
  section_id: string;
  title: string;
  kind: LessonKind;
  description: string | null;
  body: string | null;
  content_key: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  duration_minutes: number | null;
  is_preview: boolean;
  pass_percent: number | null;
  position: number;
  question_count: number;
  updated_at: Date;
};

export type Section = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: Lesson[];
};

export type QuizOption = { id: string; text: string; is_correct: boolean; explanation: string | null; position: number };
export type QuizQuestion = { id: string; prompt: string; position: number; options: QuizOption[] };

export type CourseDecision = {
  id: string;
  decision: 'approved' | 'changes_requested';
  note: string | null;
  decided_at: Date;
  admin_name: string;
};

const COURSE_COLUMNS = `id, instructor_id, slug, title, summary, description, industry, level,
  price_cents, currency, status, thumbnail_key, submitted_at, published_at, created_at, updated_at`;

const LESSON_COLUMNS = `l.id, l.section_id, l.title, l.kind, l.description, l.body, l.content_key, l.file_name,
  l.mime_type, l.size_bytes::int AS size_bytes, l.duration_minutes, l.is_preview, l.pass_percent, l.position, l.updated_at,
  (SELECT count(*)::int FROM quiz_question q WHERE q.lesson_id = l.id) AS question_count`;

/** An instructor can only edit while it is theirs and not sitting with a reviewer. */
export const isEditable = (status: CourseStatus) => status === 'draft' || status === 'changes_requested';

// ----------------------------------------------------------------- queries --

export type CourseCard = Pick<Course, 'id' | 'title' | 'status' | 'updated_at' | 'price_cents' | 'currency' | 'level' | 'industry' | 'thumbnail_key'> & {
  section_count: number;
  lesson_count: number;
  total_minutes: number;
};

const CARD_COUNTS = `
  (SELECT count(*)::int FROM section s WHERE s.course_id = c.id) AS section_count,
  (SELECT count(*)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS lesson_count,
  (SELECT coalesce(sum(l.duration_minutes), 0)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS total_minutes`;

export async function listCoursesForInstructor(instructorId: string) {
  return query<CourseCard>(
    `SELECT c.id, c.title, c.status, c.updated_at, c.price_cents, c.currency, c.level, c.industry, c.thumbnail_key, ${CARD_COUNTS}
       FROM course c
      WHERE c.instructor_id = $1
      ORDER BY c.updated_at DESC`,
    [instructorId],
  );
}

/**
 * A course, but only if it belongs to this instructor. Ownership is part of
 * the query. Memoised per render, since the editor layout and page both ask.
 */
export const getOwnedCourse = cache(async (courseId: string, instructorId: string) =>
  queryOne<Course>(`SELECT ${COURSE_COLUMNS} FROM course WHERE id = $1 AND instructor_id = $2`, [courseId, instructorId]),
);

export async function getCourse(courseId: string) {
  return queryOne<Course>(`SELECT ${COURSE_COLUMNS} FROM course WHERE id = $1`, [courseId]);
}

export const getOutline = cache(async (courseId: string): Promise<Section[]> => {
  const [sections, lessons] = await Promise.all([
    query<Omit<Section, 'lessons'>>(
      'SELECT id, title, description, position FROM section WHERE course_id = $1 ORDER BY position',
      [courseId],
    ),
    query<Lesson>(
      `SELECT ${LESSON_COLUMNS}
         FROM lesson l JOIN section s ON s.id = l.section_id
        WHERE s.course_id = $1
        ORDER BY l.position`,
      [courseId],
    ),
  ]);
  return sections.map((s) => ({ ...s, lessons: lessons.filter((l) => l.section_id === s.id) }));
});

/** A lesson with its course, only if that course belongs to this instructor. */
export async function getOwnedLesson(lessonId: string, instructorId: string) {
  return queryOne<Lesson & { course_id: string; course_status: CourseStatus; section_title: string }>(
    `SELECT ${LESSON_COLUMNS}, s.course_id, c.status AS course_status, s.title AS section_title
       FROM lesson l
       JOIN section s ON s.id = l.section_id
       JOIN course c ON c.id = s.course_id
      WHERE l.id = $1 AND c.instructor_id = $2`,
    [lessonId, instructorId],
  );
}

export async function getQuiz(lessonId: string): Promise<QuizQuestion[]> {
  const [questions, options] = await Promise.all([
    query<Omit<QuizQuestion, 'options'>>(
      'SELECT id, prompt, position FROM quiz_question WHERE lesson_id = $1 ORDER BY position',
      [lessonId],
    ),
    query<QuizOption & { question_id: string }>(
      `SELECT o.id, o.question_id, o.text, o.is_correct, o.explanation, o.position
         FROM quiz_option o JOIN quiz_question q ON q.id = o.question_id
        WHERE q.lesson_id = $1
        ORDER BY o.position`,
      [lessonId],
    ),
  ]);
  return questions.map((q) => ({ ...q, options: options.filter((o) => o.question_id === q.id) }));
}

/** Every quiz in a course, keyed by lesson, for the read-only course view. */
export async function getQuizzesForCourse(courseId: string): Promise<Record<string, QuizQuestion[]>> {
  const lessonIds = await query<{ id: string }>(
    `SELECT l.id FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = $1 AND l.kind = 'quiz'`,
    [courseId],
  );
  const entries = await Promise.all(lessonIds.map(async ({ id }) => [id, await getQuiz(id)] as const));
  return Object.fromEntries(entries);
}

export async function getCourseDecisions(courseId: string) {
  return query<CourseDecision>(
    `SELECT d.id, d.decision, d.note, d.decided_at, u.name AS admin_name
       FROM course_decision d JOIN users u ON u.id = d.admin_id
      WHERE d.course_id = $1
      ORDER BY d.decided_at DESC`,
    [courseId],
  );
}

export type ReviewCourseRow = CourseCard & {
  submitted_at: Date | null;
  instructor_name: string;
  instructor_status: string;
};

export async function listCoursesForReview(status: CourseStatus | null) {
  return query<ReviewCourseRow>(
    `SELECT c.id, c.title, c.status, c.updated_at, c.submitted_at, c.price_cents, c.currency, c.level, c.industry, c.thumbnail_key,
            p.display_name AS instructor_name, p.status AS instructor_status, ${CARD_COUNTS}
       FROM course c JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE ($1::text IS NULL AND c.status <> 'draft') OR c.status = $1
      ORDER BY c.submitted_at ASC NULLS LAST`,
    [status],
  );
}

export async function countCourses() {
  const rows = await query<{ status: string; n: number }>('SELECT status, count(*)::int AS n FROM course GROUP BY status');
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}

// --------------------------------------------------------------- readiness --

export type Check = { key: string; label: string; done: boolean; hint?: string };

/**
 * What a course needs before it can go to review. The editor draws this as a
 * checklist and submitCourse refuses anything that fails it, so the two can
 * never disagree about the rules.
 */
export function readinessChecks(course: Course, outline: Section[], instructorApproved: boolean): Check[] {
  const lessons = outline.flatMap((s) => s.lessons);
  const emptyLessons = lessons.filter((l) => !lessonHasContent(l));
  return [
    {
      key: 'details',
      label: 'Title, summary, industry and level filled in',
      done: Boolean(course.summary && course.industry && course.level),
      hint: 'Finish them on the Details tab.',
    },
    {
      key: 'thumbnail',
      label: 'A thumbnail image',
      done: course.thumbnail_key !== null,
      hint: 'Add one on the Details tab. It is what people see in the catalogue.',
    },
    {
      key: 'sections',
      label: 'At least one section, each with a lesson',
      done: outline.length > 0 && outline.every((s) => s.lessons.length > 0),
      hint: outline.length ? 'Fill or remove the empty sections.' : 'Add a section on the Curriculum tab.',
    },
    {
      key: 'content',
      label: 'Every lesson has its content',
      done: lessons.length > 0 && emptyLessons.length === 0,
      hint: emptyLessons.length
        ? `${emptyLessons.length} ${emptyLessons.length === 1 ? 'lesson is' : 'lessons are'} still empty.`
        : 'Add some lessons first.',
    },
    {
      key: 'approved',
      label: 'Your application is approved',
      done: instructorApproved,
      hint: 'Still with a reviewer. You can keep building meanwhile.',
    },
  ];
}
