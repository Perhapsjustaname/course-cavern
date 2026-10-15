import 'server-only';
import { query, queryOne } from '@/lib/db';
import type { InstructorStatus } from '@/lib/dal';

export type Credential = {
  id: string;
  kind: 'licence' | 'certification' | 'employment';
  title: string;
  issuer: string | null;
  issued_on: Date | null;
  expires_on: Date | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  verified: boolean;
  created_at: Date;
};

export type Decision = {
  id: string;
  decision: 'approved' | 'rejected' | 'more_info';
  note: string | null;
  decided_at: Date;
  admin_name: string;
};

export type Profile = {
  id: string;
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  industry: string | null;
  years_experience: number | null;
  status: InstructorStatus;
  verified_at: Date | null;
};

export type ApplicationRow = {
  id: string;
  status: 'pending' | 'more_info' | 'approved' | 'rejected';
  submitted_at: Date;
  updated_at: Date;
};

export async function getProfileForUser(userId: string) {
  return queryOne<Profile>(
    `SELECT id, user_id, display_name, headline, bio, industry, years_experience, status, verified_at
       FROM instructor_profile WHERE user_id = $1`,
    [userId],
  );
}

export async function getApplication(instructorId: string) {
  return queryOne<ApplicationRow>(
    'SELECT id, status, submitted_at, updated_at FROM application WHERE instructor_id = $1',
    [instructorId],
  );
}

export async function getCredentials(instructorId: string) {
  return query<Credential>(
    `SELECT id, kind, title, issuer, issued_on, expires_on, file_name, mime_type, size_bytes, verified, created_at
       FROM credential WHERE instructor_id = $1 ORDER BY created_at`,
    [instructorId],
  );
}

export async function getDecisions(applicationId: string) {
  return query<Decision>(
    `SELECT d.id, d.decision, d.note, d.decided_at, u.name AS admin_name
       FROM application_decision d JOIN users u ON u.id = d.admin_id
      WHERE d.application_id = $1
      ORDER BY d.decided_at DESC`,
    [applicationId],
  );
}

export type QueueRow = {
  id: string;
  status: ApplicationRow['status'];
  submitted_at: Date;
  updated_at: Date;
  display_name: string;
  headline: string | null;
  industry: string | null;
  years_experience: number | null;
  email: string;
  credential_count: number;
};

export async function listApplications(status?: ApplicationRow['status']) {
  return query<QueueRow>(
    `SELECT a.id, a.status, a.submitted_at, a.updated_at,
            p.display_name, p.headline, p.industry, p.years_experience, u.email,
            (SELECT count(*)::int FROM credential c WHERE c.instructor_id = p.id) AS credential_count
       FROM application a
       JOIN instructor_profile p ON p.id = a.instructor_id
       JOIN users u ON u.id = p.user_id
      WHERE ($1::text IS NULL OR a.status = $1)
      ORDER BY
        CASE a.status WHEN 'pending' THEN 0 WHEN 'more_info' THEN 1 ELSE 2 END,
        a.submitted_at ASC`,
    [status ?? null],
  );
}

export async function countApplications() {
  const rows = await query<{ status: string; n: number }>(
    'SELECT status, count(*)::int AS n FROM application GROUP BY status',
  );
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}

/** Everything an admin needs to decide on one application. */
export async function getApplicationForReview(applicationId: string) {
  const app = await queryOne<
    ApplicationRow & { instructor_id: string; email: string; account_name: string; account_created: Date }
  >(
    `SELECT a.id, a.status, a.submitted_at, a.updated_at, a.instructor_id,
            u.email, u.name AS account_name, u.created_at AS account_created
       FROM application a
       JOIN instructor_profile p ON p.id = a.instructor_id
       JOIN users u ON u.id = p.user_id
      WHERE a.id = $1`,
    [applicationId],
  );
  if (!app) return null;
  const [profile, credentials, decisions] = await Promise.all([
    queryOne<Profile>(
      `SELECT id, user_id, display_name, headline, bio, industry, years_experience, status, verified_at
         FROM instructor_profile WHERE id = $1`,
      [app.instructor_id],
    ),
    getCredentials(app.instructor_id),
    getDecisions(app.id),
  ]);
  return { app, profile: profile!, credentials, decisions };
}
