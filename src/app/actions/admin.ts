'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { queryOne, withTransaction } from '@/lib/db';
import { requireAdmin } from '@/lib/dal';
import { isUuid } from '@/lib/ids';
import { decisionNoteSchema } from '@/lib/validation';

export type DecisionState = { message?: string; errors?: { note?: string[]; decision?: string[] } } | undefined;

const APP_DECISIONS = ['approved', 'more_info', 'rejected'] as const;
const COURSE_DECISIONS = ['approved', 'changes_requested'] as const;

function readDecision<T extends readonly string[]>(form: FormData, allowed: T): T[number] | null {
  const d = form.get('decision');
  return typeof d === 'string' && (allowed as readonly string[]).includes(d) ? (d as T[number]) : null;
}

export async function decideApplication(
  applicationId: string,
  _prev: DecisionState,
  form: FormData,
): Promise<DecisionState> {
  // Authorisation comes before anything touches a pooled connection.
  const admin = await requireAdmin();
  if (!isUuid(applicationId)) return { message: 'Application not found.' };

  const decision = readDecision(form, APP_DECISIONS);
  if (!decision) return { errors: { decision: ['Choose an outcome.'] } };

  const note = decisionNoteSchema.safeParse(form.get('note') ?? '');
  if (!note.success) return { errors: { note: ['Keep the note under 2,000 characters.'] } };
  if (decision !== 'approved' && !note.data) {
    return {
      errors: {
        note: [
          decision === 'more_info'
            ? 'Say what is missing, so they know what to send.'
            : 'Explain why. They will see this note.',
        ],
      },
    };
  }

  const app = await queryOne<{ instructor_id: string; user_id: string }>(
    `SELECT a.instructor_id, p.user_id
       FROM application a JOIN instructor_profile p ON p.id = a.instructor_id
      WHERE a.id = $1`,
    [applicationId],
  );
  if (!app) return { message: 'Application not found.' };
  if (app.user_id === admin.id) return { message: 'You cannot decide on your own application.' };

  await withTransaction(async (db) => {
    // The decision itself is the record of truth. Everything after it is
    // derived state, written in the same transaction so they cannot disagree.
    await db.query(
      'INSERT INTO application_decision (application_id, admin_id, decision, note) VALUES ($1, $2, $3, $4)',
      [applicationId, admin.id, decision, note.data ?? null],
    );
    await db.query('UPDATE application SET status = $2, updated_at = now() WHERE id = $1', [applicationId, decision]);
    await db.query(
      `UPDATE instructor_profile
          SET status = $2,
              verified_at = CASE WHEN $2 = 'approved' THEN now() ELSE NULL END,
              updated_at = now()
        WHERE id = $1`,
      [app.instructor_id, decision],
    );
    // Role follows the decision, so reopening a wrong approval also removes access.
    await db.query(
      `UPDATE users SET role = $2, updated_at = now() WHERE id = $1 AND role <> 'admin'`,
      [app.user_id, decision === 'approved' ? 'instructor' : 'student'],
    );
    if (decision === 'approved') {
      await db.query('UPDATE credential SET verified = true WHERE instructor_id = $1', [app.instructor_id]);
    }
  });

  revalidatePath('/', 'layout');
  redirect(`/admin/applications?saved=${decision}`);
}

export async function decideCourse(courseId: string, _prev: DecisionState, form: FormData): Promise<DecisionState> {
  const admin = await requireAdmin();
  if (!isUuid(courseId)) return { message: 'Course not found.' };

  const decision = readDecision(form, COURSE_DECISIONS);
  if (!decision) return { errors: { decision: ['Choose an outcome.'] } };

  const note = decisionNoteSchema.safeParse(form.get('note') ?? '');
  if (!note.success) return { errors: { note: ['Keep the note under 2,000 characters.'] } };
  if (decision === 'changes_requested' && !note.data) {
    return { errors: { note: ['List the changes, so the instructor knows what to fix.'] } };
  }

  const course = await queryOne<{ status: string; instructor_status: string }>(
    `SELECT c.status, p.status AS instructor_status
       FROM course c JOIN instructor_profile p ON p.id = c.instructor_id
      WHERE c.id = $1`,
    [courseId],
  );
  if (!course) return { message: 'Course not found.' };
  if (course.status !== 'in_review') {
    return { message: 'This course is no longer waiting for review. Someone may have got to it first.' };
  }
  if (decision === 'approved' && course.instructor_status !== 'approved') {
    return { message: 'The instructor is not approved any more, so this cannot be published.' };
  }

  // The status check above is for a friendly message. This conditional update
  // is what actually stops two reviewers deciding the same course at once: only
  // one of them can move it out of in_review.
  const won = await withTransaction(async (db) => {
    const moved = await db.query(
      `UPDATE course
          SET status = $2,
              published_at = CASE WHEN $2 = 'published' THEN now() ELSE published_at END,
              updated_at = now()
        WHERE id = $1 AND status = 'in_review'`,
      [courseId, decision === 'approved' ? 'published' : 'changes_requested'],
    );
    if (moved.rowCount !== 1) return false;
    await db.query('INSERT INTO course_decision (course_id, admin_id, decision, note) VALUES ($1, $2, $3, $4)', [
      courseId,
      admin.id,
      decision,
      note.data ?? null,
    ]);
    return true;
  });
  if (!won) return { message: 'Another reviewer decided on this course a moment ago.' };

  revalidatePath('/', 'layout');
  redirect(`/admin/courses?saved=${decision}`);
}
