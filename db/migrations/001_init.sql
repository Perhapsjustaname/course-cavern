-- Course Cavern, initial schema.
-- Mirrors src/lib/schema.ts, which is what the /development page renders.
-- Change one, change the other.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- identity --

CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email             text NOT NULL UNIQUE,
    password_hash     text NOT NULL,
    role              text NOT NULL DEFAULT 'student'
                          CHECK (role IN ('student', 'instructor', 'admin')),
    email_verified_at timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE instructor_profile (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    display_name      text NOT NULL,
    headline          text,
    bio               text,
    industry          text,
    status            text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    verified_at       timestamptz,
    stripe_account_id text UNIQUE,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credential (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id uuid NOT NULL REFERENCES instructor_profile (id) ON DELETE CASCADE,
    kind          text NOT NULL CHECK (kind IN ('licence', 'certification', 'employment')),
    title         text NOT NULL,
    issuer        text,
    issued_on     date,
    expires_on    date,
    document_key  text NOT NULL,
    verified      boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credential_instructor_idx ON credential (instructor_id);

CREATE TABLE application (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id uuid NOT NULL REFERENCES instructor_profile (id) ON DELETE CASCADE,
    status        text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'more_info', 'approved', 'rejected')),
    submitted_at  timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_status_idx ON application (status, submitted_at);

-- Append only. Nothing here is ever updated or deleted; that is the point.
CREATE TABLE application_decision (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    admin_id       uuid NOT NULL REFERENCES users (id),
    decision       text NOT NULL CHECK (decision IN ('approved', 'rejected', 'more_info')),
    note           text,
    decided_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_decision_app_idx ON application_decision (application_id, decided_at);

-- --------------------------------------------------------------- catalogue --

CREATE TABLE course (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id uuid NOT NULL REFERENCES instructor_profile (id) ON DELETE CASCADE,
    slug          text NOT NULL UNIQUE,
    title         text NOT NULL,
    summary       text,
    description   text,
    industry      text,
    level         text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    price_cents   integer NOT NULL CHECK (price_cents >= 0),
    currency      char(3) NOT NULL DEFAULT 'CAD',
    status        text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'in_review', 'published', 'rejected')),
    published_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX course_catalogue_idx ON course (status, industry, level);

CREATE TABLE section (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  uuid NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    title      text NOT NULL,
    position   integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (course_id, position)
);

CREATE TABLE lesson (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id       uuid NOT NULL REFERENCES section (id) ON DELETE CASCADE,
    title            text NOT NULL,
    kind             text NOT NULL CHECK (kind IN ('video', 'audio', 'pdf', 'text', 'quiz')),
    content_key      text,
    duration_seconds integer,
    position         integer NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (section_id, position)
);

-- ---------------------------------------------------------------- learning --

CREATE TABLE enrolment (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id    uuid NOT NULL REFERENCES course (id) ON DELETE RESTRICT,
    enrolled_at  timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE (user_id, course_id)
);

CREATE TABLE progress (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id uuid NOT NULL REFERENCES enrolment (id) ON DELETE CASCADE,
    lesson_id    uuid NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
    completed_at timestamptz,
    UNIQUE (enrolment_id, lesson_id)
);

CREATE TABLE review (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id uuid NOT NULL UNIQUE REFERENCES enrolment (id) ON DELETE CASCADE,
    course_id    uuid NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    rating       integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      text,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_course_idx ON review (course_id);

-- ------------------------------------------------------------------- money --

CREATE TABLE payment (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id             uuid NOT NULL REFERENCES enrolment (id) ON DELETE RESTRICT,
    stripe_payment_intent_id text NOT NULL UNIQUE,
    amount_cents             integer NOT NULL CHECK (amount_cents >= 0),
    platform_fee_cents       integer NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
    status                   text NOT NULL
                                 CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payout (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id      uuid NOT NULL REFERENCES instructor_profile (id) ON DELETE RESTRICT,
    stripe_transfer_id text NOT NULL UNIQUE,
    amount_cents       integer NOT NULL CHECK (amount_cents >= 0),
    status             text NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
    created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payout_instructor_idx ON payout (instructor_id, created_at);
