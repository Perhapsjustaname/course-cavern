'use server';

import type pg from 'pg';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser, requireUser } from '@/lib/dal';
import { query, queryOne, withTransaction } from '@/lib/db';
import { getQuiz, type CourseStatus } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import type { LessonKind } from '@/lib/lessons';

type LessonRow = {
  lesson_id: string;
  kind: LessonKind;
  is_preview: boolean;
  pass_percent: number | null;
  course_id: string;
  slug: string;
  status: CourseStatus;
  live: boolean;
  owner_user_id: string;
};

/** A lesson with the course it belongs to. Everything here starts from one. */
async function lessonWithCourse(lessonId: unknown) {
  if (typeof lessonId !== 'string' || !isUuid(lessonId)) return null;
  return queryOne<LessonRow>(
    `SELECT l.id AS lesson_id, l.kind, l.is_preview, l.pass_percent,
            c.id AS course_id, c.slug, c.status, (c.status = 'published' AND p.status = 'approved') AS live,
            p.user_id AS owner_user_id
       FROM lesson l
       JOIN section s ON s.id = l.section_id
       JOIN course c ON c.id = s.course_id
       JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE l.id = $1`,
    [lessonId],
  );
}

async function enrolmentId(userId: string, courseId: string) {
  const row = await queryOne<{ id: string }>('SELECT id FROM enrolment WHERE user_id = $1 AND course_id = $2', [userId, courseId]);
  return row?.id ?? null;
}

/**
 * Finished means every lesson in the course is done. Checked after each change,
 * so un-ticking a lesson, or a lesson added later, makes it unfinished again.
 */
async function settleCompletion(db: pg.PoolClient, enrolment: string, courseId: string) {
  const { rows } = await db.query<{ completed_at: Date | null }>(
    `UPDATE enrolment e
        SET completed_at = CASE WHEN t.total > 0 AND t.done >= t.total THEN coalesce(e.completed_at, now()) END,
            last_active_at = now()
       FROM (SELECT (SELECT count(*) FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = $2) AS total,
                    (SELECT count(*) FROM progress pr WHERE pr.enrolment_id = $1) AS done) t
      WHERE e.id = $1
      RETURNING e.completed_at`,
    [enrolment, courseId],
  );
  return rows[0]?.completed_at != null;
}

function refresh(slug: string) {
  revalidatePath(`/learn/${slug}`, 'layout');
  revalidatePath('/learning');
}

// ---------------------------------------------------------------- enrolling --

export async function enrol(courseId: string) {
  const user = await requireUser();
  const course = isUuid(courseId)
    ? await queryOne<{ slug: string; live: boolean; owner_user_id: string }>(
        `SELECT c.slug, (c.status = 'published' AND p.status = 'approved') AS live, p.user_id AS owner_user_id
           FROM course c JOIN instructor_profile p ON p.id = c.instructor_id
          WHERE c.id = $1`,
        [courseId],
      )
    : null;
  if (!course?.live) redirect('/courses');
  if (course.owner_user_id === user.id) redirect(`/courses/${course.slug}`);

  // Payments are not switched on yet, so every course is free to join for now.
  // Checkout belongs here: take the payment, then enrol once it has gone through.
  await query('INSERT INTO enrolment (user_id, course_id) VALUES ($1, $2) ON CONFLICT (user_id, course_id) DO NOTHING', [
    user.id,
    courseId,
  ]);
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath('/learning');
  redirect(`/learn/${course.slug}`);
}

// ---------------------------------------------------------------- progress --

export type DoneResult = { ok: true; done: boolean; courseDone: boolean } | { ok: false; message: string };

/** Tick or untick a lesson. Quizzes are ticked by passing them, not by hand. */
export async function setLessonDone(lessonId: string, done: boolean): Promise<DoneResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Sign in to save your progress.' };
  const lesson = await lessonWithCourse(lessonId);
  if (!lesson) return { ok: false, message: 'Lesson not found.' };
  if (!lesson.live) return { ok: false, message: 'This course is being updated, so progress cannot be saved right now.' };
  if (lesson.kind === 'quiz') return { ok: false, message: 'Pass the quiz to finish this lesson.' };
  const enrolment = await enrolmentId(user.id, lesson.course_id);
  if (!enrolment) return { ok: false, message: 'Enrol in the course to save your progress.' };

  const courseDone = await withTransaction(async (db) => {
    if (done) {
      await db.query(
        'INSERT INTO progress (enrolment_id, lesson_id) VALUES ($1, $2) ON CONFLICT (enrolment_id, lesson_id) DO NOTHING',
        [enrolment, lesson.lesson_id],
      );
    } else {
      await db.query('DELETE FROM progress WHERE enrolment_id = $1 AND lesson_id = $2', [enrolment, lesson.lesson_id]);
    }
    return settleCompletion(db, enrolment, lesson.course_id);
  });
  refresh(lesson.slug);
  return { ok: true, done: Boolean(done), courseDone };
}

/** Remember the lesson a student is on, so "Continue" brings them back to it. */
export async function recordVisit(lessonId: string) {
  const user = await getCurrentUser();
  if (!user || typeof lessonId !== 'string' || !isUuid(lessonId)) return;
  await query(
    `UPDATE enrolment e
        SET last_lesson_id = l.id, last_active_at = now()
       FROM lesson l JOIN section s ON s.id = l.section_id
      WHERE l.id = $2 AND e.course_id = s.course_id AND e.user_id = $1`,
    [user.id, lessonId],
  );
}

// ----------------------------------------------------------------- quizzes --

export type QuizFeedback = {
  chosen: string;
  right: boolean;
  explanation: string | null;
  /** The right option. Shown for a wrong pick only once the quiz is passed. */
  answer: string | null;
};

export type QuizResult =
  | { ok: false; message: string; missing?: string[] }
  | {
      ok: true;
      correct: number;
      total: number;
      score: number;
      passMark: number;
      passed: boolean;
      saved: boolean;
      courseDone: boolean;
      feedback: Record<string, QuizFeedback>;
    };

/**
 * Marked here, never in the browser: the page only ever receives questions and
 * choices. A pass ticks the lesson off. Previews and the course's own staff get
 * marked too, but nothing is saved for them.
 */
export async function submitQuiz(lessonId: string, answers: Record<string, string>): Promise<QuizResult> {
  const lesson = await lessonWithCourse(lessonId);
  if (!lesson || lesson.kind !== 'quiz') return { ok: false, message: 'Quiz not found.' };
  const user = await getCurrentUser();
  const staff = Boolean(user && (user.id === lesson.owner_user_id || (user.role === 'admin' && lesson.status !== 'draft')));
  const enrolment = user && lesson.live ? await enrolmentId(user.id, lesson.course_id) : null;
  if (!staff && !(lesson.live && (enrolment || lesson.is_preview))) {
    return { ok: false, message: 'Enrol in the course to take this quiz.' };
  }

  const questions = await getQuiz(lesson.lesson_id);
  if (!questions.length) return { ok: false, message: 'This quiz has no questions yet.' };
  const picked: Record<string, unknown> = answers && typeof answers === 'object' ? answers : {};
  const chosenFor = (q: (typeof questions)[number]) => q.options.find((o) => o.id === picked[q.id]);
  const missing = questions.filter((q) => !chosenFor(q)).map((q) => q.id);
  if (missing.length) {
    return {
      ok: false,
      message: missing.length === 1 ? 'One question still needs an answer.' : `${missing.length} questions still need an answer.`,
      missing,
    };
  }

  const marked = questions.map((q) => ({ q, chosen: chosenFor(q)! }));
  const correct = marked.filter((m) => m.chosen.is_correct).length;
  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const passMark = lesson.pass_percent ?? 80;
  const passed = score >= passMark;
  const feedback: Record<string, QuizFeedback> = Object.fromEntries(
    marked.map(({ q, chosen }) => [
      q.id,
      {
        chosen: chosen.id,
        right: chosen.is_correct,
        explanation: chosen.explanation,
        // Held back after a fail, or the next attempt is just copying.
        answer: chosen.is_correct || passed ? (q.options.find((o) => o.is_correct)?.id ?? null) : null,
      },
    ]),
  );

  let courseDone = false;
  if (enrolment) {
    courseDone = await withTransaction(async (db) => {
      await db.query(
        `INSERT INTO quiz_attempt (enrolment_id, lesson_id, correct, total, score_percent, passed, answers)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [enrolment, lesson.lesson_id, correct, total, score, passed, JSON.stringify(Object.fromEntries(marked.map((m) => [m.q.id, m.chosen.id])))],
      );
      if (passed) {
        await db.query(
          'INSERT INTO progress (enrolment_id, lesson_id) VALUES ($1, $2) ON CONFLICT (enrolment_id, lesson_id) DO NOTHING',
          [enrolment, lesson.lesson_id],
        );
      }
      return settleCompletion(db, enrolment, lesson.course_id);
    });
    refresh(lesson.slug);
  }
  return { ok: true, correct, total, score, passMark, passed, saved: Boolean(enrolment), courseDone, feedback };
}
