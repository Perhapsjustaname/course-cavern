import 'server-only';
import { query, queryOne } from '@/lib/db';

export type CourseStatus = 'draft' | 'in_review' | 'changes_requested' | 'published';

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
  submitted_at: Date | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type Lesson = {
  id: string;
  section_id: string;
  title: string;
  kind: 'video' | 'audio' | 'pdf' | 'text' | 'quiz';
  duration_minutes: number | null;
  position: number;
};

export type Section = {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
};

export type CourseDecision = {
  id: string;
  decision: 'approved' | 'changes_requested';
  note: string | null;
  decided_at: Date;
  admin_name: string;
};

const COURSE_COLUMNS = `id, instructor_id, slug, title, summary, description, industry, level,
  price_cents, currency, status, submitted_at, published_at, created_at, updated_at`;

/** An instructor can only edit while it is theirs and not sitting with a reviewer. */
export const isEditable = (status: CourseStatus) => status === 'draft' || status === 'changes_requested';

export type CourseCard = Pick<Course, 'id' | 'title' | 'status' | 'updated_at' | 'price_cents' | 'currency' | 'level' | 'industry'> & {
  section_count: number;
  lesson_count: number;
  total_minutes: number;
};

export async function listCoursesForInstructor(instructorId: string) {
  return query<CourseCard>(
    `SELECT c.id, c.title, c.status, c.updated_at, c.price_cents, c.currency, c.level, c.industry,
            (SELECT count(*)::int FROM section s WHERE s.course_id = c.id) AS section_count,
            (SELECT count(*)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS lesson_count,
            (SELECT coalesce(sum(l.duration_minutes), 0)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS total_minutes
       FROM course c
      WHERE c.instructor_id = $1
      ORDER BY c.updated_at DESC`,
    [instructorId],
  );
}

/** A course, but only if it belongs to this instructor. Ownership is part of the query. */
export async function getOwnedCourse(courseId: string, instructorId: string) {
  return queryOne<Course>(`SELECT ${COURSE_COLUMNS} FROM course WHERE id = $1 AND instructor_id = $2`, [
    courseId,
    instructorId,
  ]);
}

export async function getCourse(courseId: string) {
  return queryOne<Course>(`SELECT ${COURSE_COLUMNS} FROM course WHERE id = $1`, [courseId]);
}

export async function getOutline(courseId: string): Promise<Section[]> {
  const [sections, lessons] = await Promise.all([
    query<Omit<Section, 'lessons'>>('SELECT id, title, position FROM section WHERE course_id = $1 ORDER BY position', [courseId]),
    query<Lesson>(
      `SELECT l.id, l.section_id, l.title, l.kind, l.duration_minutes, l.position
         FROM lesson l JOIN section s ON s.id = l.section_id
        WHERE s.course_id = $1
        ORDER BY l.position`,
      [courseId],
    ),
  ]);
  return sections.map((s) => ({ ...s, lessons: lessons.filter((l) => l.section_id === s.id) }));
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
    `SELECT c.id, c.title, c.status, c.updated_at, c.submitted_at, c.price_cents, c.currency, c.level, c.industry,
            p.display_name AS instructor_name, p.status AS instructor_status,
            (SELECT count(*)::int FROM section s WHERE s.course_id = c.id) AS section_count,
            (SELECT count(*)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS lesson_count,
            (SELECT coalesce(sum(l.duration_minutes), 0)::int FROM lesson l JOIN section s ON s.id = l.section_id WHERE s.course_id = c.id) AS total_minutes
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
