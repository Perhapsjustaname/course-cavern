import 'server-only';
import { cache } from 'react';
import { query, queryOne } from '@/lib/db';
import { getQuiz, type Course } from '@/lib/courses';
import { INDUSTRIES, LEVELS, type Level } from '@/lib/constants';
import { sanitizeRichText } from '@/lib/rich-text';
import type { CurrentUser } from '@/lib/dal';

/**
 * What students see: the catalogue, course pages, enrolments, progress and
 * quizzes. A course is "live" when it is published and its instructor is still
 * approved. Taking a course offline, or an instructor losing approval, hides it
 * from the catalogue and locks its lessons, but enrolments and progress stay.
 */

const LIVE = `(c.status = 'published' AND p.status = 'approved')`;

const COUNTS = `
  (SELECT count(*)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS lesson_count,
  (SELECT coalesce(sum(l.duration_minutes), 0)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS total_minutes,
  (SELECT count(*)::int FROM enrolment e WHERE e.course_id = c.id) AS student_count`;

// --------------------------------------------------------------- catalogue --

export type CatalogueCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  industry: string | null;
  level: Level | null;
  price_cents: number;
  currency: string;
  thumbnail_key: string | null;
  updated_at: Date;
  instructor_id: string;
  instructor_name: string;
  lesson_count: number;
  total_minutes: number;
  student_count: number;
};

export type CatalogueFilters = { q?: string; industry?: string; level?: Level; price?: 'free' | 'paid' };

/** Search params, kept only when they are values the catalogue knows. */
export function readFilters(params: Record<string, string | string[] | undefined>): CatalogueFilters {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const industry = one('industry');
  const level = one('level');
  const price = one('price');
  return {
    q: one('q')?.slice(0, 100),
    industry: (INDUSTRIES as readonly string[]).includes(industry ?? '') ? industry : undefined,
    level: LEVELS.some((l) => l.value === level) ? (level as Level) : undefined,
    price: price === 'free' || price === 'paid' ? price : undefined,
  };
}

/** % and _ typed into the search box are matched literally. */
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

export async function listCatalogue(f: CatalogueFilters, limit = 60) {
  return query<CatalogueCourse>(
    `SELECT c.id, c.slug, c.title, c.summary, c.industry, c.level, c.price_cents, c.currency, c.thumbnail_key,
            c.updated_at, p.id AS instructor_id, p.display_name AS instructor_name, ${COUNTS}
       FROM course c JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE ${LIVE}
        AND ($1::text IS NULL OR c.title ILIKE $1 OR c.summary ILIKE $1 OR p.display_name ILIKE $1)
        AND ($2::text IS NULL OR c.industry = $2)
        AND ($3::text IS NULL OR c.level = $3)
        AND ($4::text IS NULL OR (c.price_cents = 0) = ($4 = 'free'))
      ORDER BY c.published_at DESC NULLS LAST
      LIMIT $5`,
    [f.q ? likePattern(f.q) : null, f.industry ?? null, f.level ?? null, f.price ?? null, limit],
  );
}

export async function countLiveCourses() {
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM course c JOIN instructor_profile p ON p.id = c.instructor_id WHERE ${LIVE}`,
  );
  return row?.n ?? 0;
}

// ------------------------------------------------------------ course pages --

export type PublicCourse = Course & {
  live: boolean;
  owner_user_id: string;
  instructor_name: string;
  instructor_headline: string | null;
  instructor_years: number | null;
  instructor_verified_at: Date | null;
  student_count: number;
};

/** By slug, whatever its status. Callers decide who may see it. */
export const getCourseBySlug = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return queryOne<PublicCourse>(
    `SELECT c.id, c.instructor_id, c.slug, c.title, c.summary, c.description, c.industry, c.level, c.price_cents,
            c.currency, c.status, c.thumbnail_key, c.submitted_at, c.published_at, c.created_at, c.updated_at,
            ${LIVE} AS live, p.user_id AS owner_user_id, p.display_name AS instructor_name,
            p.headline AS instructor_headline, p.years_experience AS instructor_years,
            p.verified_at AS instructor_verified_at,
            (SELECT count(*)::int FROM enrolment e WHERE e.course_id = c.id) AS student_count
       FROM course c JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE c.slug = $1`,
    [slug],
  );
});

/**
 * The course's own instructor, or an admin once it has been sent for review.
 * They can open every lesson, but nothing they do counts as progress.
 */
export function isStaff(course: Pick<PublicCourse, 'owner_user_id' | 'status'>, user: CurrentUser | null) {
  if (!user) return false;
  return user.id === course.owner_user_id || (user.role === 'admin' && course.status !== 'draft');
}

export type VerifiedCredential = { kind: string; title: string; issuer: string | null };

export async function getVerifiedCredentials(instructorId: string) {
  return query<VerifiedCredential>(
    `SELECT kind, title, issuer FROM credential WHERE instructor_id = $1 AND verified ORDER BY created_at`,
    [instructorId],
  );
}

export type PublicInstructor = {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  industry: string | null;
  years_experience: number | null;
  verified_at: Date | null;
};

/** Only approved instructors have a public page. */
export async function getPublicInstructor(id: string) {
  return queryOne<PublicInstructor>(
    `SELECT id, display_name, headline, bio, industry, years_experience, verified_at
       FROM instructor_profile WHERE id = $1 AND status = 'approved'`,
    [id],
  );
}

export async function listInstructorCourses(instructorId: string) {
  return query<CatalogueCourse>(
    `SELECT c.id, c.slug, c.title, c.summary, c.industry, c.level, c.price_cents, c.currency, c.thumbnail_key,
            c.updated_at, p.id AS instructor_id, p.display_name AS instructor_name, ${COUNTS}
       FROM course c JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE ${LIVE} AND p.id = $1
      ORDER BY c.published_at DESC NULLS LAST`,
    [instructorId],
  );
}

// -------------------------------------------------------------- enrolments --

export type Enrolment = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: Date;
  completed_at: Date | null;
  last_lesson_id: string | null;
  last_active_at: Date;
};

export const getEnrolment = cache(async (userId: string, courseId: string) =>
  queryOne<Enrolment>(
    `SELECT id, user_id, course_id, enrolled_at, completed_at, last_lesson_id, last_active_at
       FROM enrolment WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId],
  ),
);

export const getDoneLessonIds = cache(async (enrolmentId: string) => {
  const rows = await query<{ lesson_id: string }>('SELECT lesson_id FROM progress WHERE enrolment_id = $1', [enrolmentId]);
  return new Set(rows.map((r) => r.lesson_id));
});

export type LearningRow = {
  enrolment_id: string;
  enrolled_at: Date;
  completed_at: Date | null;
  last_active_at: Date;
  course_id: string;
  slug: string;
  title: string;
  thumbnail_key: string | null;
  updated_at: Date;
  instructor_name: string;
  live: boolean;
  lesson_count: number;
  done_count: number;
  last_lesson_title: string | null;
};

export async function listMyLearning(userId: string) {
  return query<LearningRow>(
    `SELECT e.id AS enrolment_id, e.enrolled_at, e.completed_at, e.last_active_at,
            c.id AS course_id, c.slug, c.title, c.thumbnail_key, c.updated_at,
            p.display_name AS instructor_name, ${LIVE} AS live,
            (SELECT count(*)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS lesson_count,
            (SELECT count(*)::int FROM progress pr WHERE pr.enrolment_id = e.id) AS done_count,
            (SELECT l.title FROM lesson l WHERE l.id = e.last_lesson_id) AS last_lesson_title
       FROM enrolment e
       JOIN course c ON c.id = e.course_id
       JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE e.user_id = $1
      ORDER BY e.last_active_at DESC`,
    [userId],
  );
}

// ------------------------------------------------------------------ quizzes --

/** A quiz as a student gets it: the questions and choices, never the answers. */
export type StudentQuestion = { id: string; prompt: string; options: { id: string; text: string }[] };

export async function getQuizForStudent(lessonId: string): Promise<StudentQuestion[]> {
  const questions = await getQuiz(lessonId);
  return questions.map((q) => ({
    id: q.id,
    // Cleaned here because the quiz renders in the browser, away from <RichText>.
    prompt: sanitizeRichText(q.prompt),
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  }));
}

export type AttemptSummary = { best: number; passed: boolean; attempts: number; last_at: Date };

export async function getAttemptSummary(enrolmentId: string, lessonId: string) {
  return queryOne<AttemptSummary>(
    `SELECT max(score_percent)::int AS best, bool_or(passed) AS passed, count(*)::int AS attempts, max(created_at) AS last_at
       FROM quiz_attempt WHERE enrolment_id = $1 AND lesson_id = $2
     HAVING count(*) > 0`,
    [enrolmentId, lessonId],
  );
}
