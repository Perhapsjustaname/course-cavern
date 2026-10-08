/**
 * The database structure, as data.
 *
 * This drives the /development page so the app runs with no database attached.
 * The executable version lives in db/migrations/001_init.sql. Change one, change
 * the other.
 */

export type Column = {
  name: string;
  type: string;
  key?: 'pk' | 'fk' | 'unique';
  note?: string;
};

export type Table = {
  name: string;
  purpose: string;
  columns: Column[];
};

export type Group = {
  name: string;
  blurb: string;
  tables: Table[];
};

export const SCHEMA_GROUPS: Group[] = [
  {
    name: 'Identity and vetting',
    blurb:
      'Who someone is, what they claim, and the recorded decision on whether that claim held up. The audit trail is a separate table on purpose, so a decision can never be quietly overwritten.',
    tables: [
      {
        name: 'users',
        purpose: 'Every account, whatever role it holds.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'email', type: 'text', key: 'unique' },
          { name: 'password_hash', type: 'text', note: 'bcrypt' },
          { name: 'role', type: 'text', note: 'student | instructor | admin' },
          { name: 'email_verified_at', type: 'timestamptz', note: 'null until the code is used' },
          { name: 'created_at', type: 'timestamptz' },
        ],
      },
      {
        name: 'instructor_profile',
        purpose: 'The public face of a vetted instructor. One per user, at most.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'user_id', type: 'uuid', key: 'fk', note: 'users, unique' },
          { name: 'display_name', type: 'text' },
          { name: 'headline', type: 'text', note: 'e.g. Journeyman electrician, 20 years' },
          { name: 'bio', type: 'text' },
          { name: 'industry', type: 'text' },
          { name: 'status', type: 'text', note: 'draft | pending | approved | rejected' },
          { name: 'verified_at', type: 'timestamptz', note: 'drives the badge' },
          { name: 'stripe_account_id', type: 'text', note: 'Connect account, null until onboarded' },
        ],
      },
      {
        name: 'credential',
        purpose: 'One piece of submitted evidence. Documents live in private storage, never on disk here.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'instructor_id', type: 'uuid', key: 'fk', note: 'instructor_profile' },
          { name: 'kind', type: 'text', note: 'licence | certification | employment' },
          { name: 'title', type: 'text' },
          { name: 'issuer', type: 'text' },
          { name: 'issued_on', type: 'date' },
          { name: 'expires_on', type: 'date', note: 'null if it does not expire' },
          { name: 'document_key', type: 'text', note: 'object storage key, served by signed URL' },
          { name: 'verified', type: 'boolean' },
        ],
      },
      {
        name: 'application',
        purpose: 'A request to sell. Its current state only.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'instructor_id', type: 'uuid', key: 'fk', note: 'instructor_profile' },
          { name: 'status', type: 'text', note: 'pending | more_info | approved | rejected' },
          { name: 'submitted_at', type: 'timestamptz' },
        ],
      },
      {
        name: 'application_decision',
        purpose: 'Append only. Every approve, reject or request for more, with who and when.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'application_id', type: 'uuid', key: 'fk', note: 'application' },
          { name: 'admin_id', type: 'uuid', key: 'fk', note: 'users' },
          { name: 'decision', type: 'text', note: 'approved | rejected | more_info' },
          { name: 'note', type: 'text', note: 'reason shown to the instructor' },
          { name: 'decided_at', type: 'timestamptz' },
        ],
      },
    ],
  },
  {
    name: 'Catalogue',
    blurb:
      'What is for sale and how it is put together. A course is three levels deep: course, then section, then lesson.',
    tables: [
      {
        name: 'course',
        purpose: 'A priced, publishable unit of learning.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'instructor_id', type: 'uuid', key: 'fk', note: 'instructor_profile' },
          { name: 'slug', type: 'text', key: 'unique' },
          { name: 'title', type: 'text' },
          { name: 'summary', type: 'text' },
          { name: 'industry', type: 'text', note: 'catalogue filter' },
          { name: 'level', type: 'text', note: 'beginner | intermediate | advanced' },
          { name: 'price_cents', type: 'integer', note: 'cents, never a float' },
          { name: 'status', type: 'text', note: 'draft | in_review | published | rejected' },
          { name: 'published_at', type: 'timestamptz' },
        ],
      },
      {
        name: 'section',
        purpose: 'An ordered group of lessons inside one course.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'course_id', type: 'uuid', key: 'fk', note: 'course' },
          { name: 'title', type: 'text' },
          { name: 'position', type: 'integer', note: 'unique per course' },
        ],
      },
      {
        name: 'lesson',
        purpose: 'One content item. The file itself sits in object storage.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'section_id', type: 'uuid', key: 'fk', note: 'section' },
          { name: 'title', type: 'text' },
          { name: 'kind', type: 'text', note: 'video | audio | pdf | text | quiz' },
          { name: 'content_key', type: 'text', note: 'object storage key' },
          { name: 'duration_seconds', type: 'integer' },
          { name: 'position', type: 'integer', note: 'unique per section' },
        ],
      },
    ],
  },
  {
    name: 'Learning',
    blurb:
      'What a student bought and how far through it they are. Progress hangs off the enrolment rather than the user, so access and position travel together.',
    tables: [
      {
        name: 'enrolment',
        purpose: 'Paid access to one course. One row per student per course.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'user_id', type: 'uuid', key: 'fk', note: 'users' },
          { name: 'course_id', type: 'uuid', key: 'fk', note: 'course' },
          { name: 'enrolled_at', type: 'timestamptz' },
          { name: 'completed_at', type: 'timestamptz' },
          { name: '(user_id, course_id)', type: 'unique', key: 'unique', note: 'no double enrolment' },
        ],
      },
      {
        name: 'progress',
        purpose: 'Per lesson completion for one enrolment.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'enrolment_id', type: 'uuid', key: 'fk', note: 'enrolment' },
          { name: 'lesson_id', type: 'uuid', key: 'fk', note: 'lesson' },
          { name: 'completed_at', type: 'timestamptz' },
          { name: '(enrolment_id, lesson_id)', type: 'unique', key: 'unique' },
        ],
      },
      {
        name: 'review',
        purpose: 'Tied to an enrolment, so only someone who paid can leave one.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'enrolment_id', type: 'uuid', key: 'fk', note: 'enrolment, unique' },
          { name: 'course_id', type: 'uuid', key: 'fk', note: 'course, denormalised for listing' },
          { name: 'rating', type: 'integer', note: 'check between 1 and 5' },
          { name: 'comment', type: 'text' },
        ],
      },
    ],
  },
  {
    name: 'Money',
    blurb:
      'Card data never reaches this database. These tables hold our own record of what the gateway did, keyed by its identifiers.',
    tables: [
      {
        name: 'payment',
        purpose: 'What a student paid. Written in the same transaction as the enrolment.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'enrolment_id', type: 'uuid', key: 'fk', note: 'enrolment' },
          { name: 'stripe_payment_intent_id', type: 'text', key: 'unique', note: 'idempotency on webhook replay' },
          { name: 'amount_cents', type: 'integer' },
          { name: 'platform_fee_cents', type: 'integer' },
          { name: 'status', type: 'text', note: 'pending | succeeded | failed | refunded' },
        ],
      },
      {
        name: 'payout',
        purpose: 'What we sent an instructor, and whether it landed.',
        columns: [
          { name: 'id', type: 'uuid', key: 'pk' },
          { name: 'instructor_id', type: 'uuid', key: 'fk', note: 'instructor_profile' },
          { name: 'stripe_transfer_id', type: 'text', key: 'unique' },
          { name: 'amount_cents', type: 'integer' },
          { name: 'status', type: 'text', note: 'pending | paid | failed' },
          { name: 'created_at', type: 'timestamptz' },
        ],
      },
    ],
  },
];

export const SCHEMA_NOTES = [
  'Money is stored in integer cents. No floats anywhere near a price.',
  'Payment and enrolment are written inside one transaction, so a student who paid is never left without access.',
  'application_decision is append only. Nothing overwrites a past decision, which is what makes the vetting defensible.',
  'Uploaded files are keys into object storage, served through signed URLs that expire. Credential documents are never public.',
  'Every table carries created_at. The ones that change carry updated_at as well.',
];

export const TABLE_COUNT = SCHEMA_GROUPS.reduce((n, g) => n + g.tables.length, 0);
