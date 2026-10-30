-- Students taking courses: where each one left off, and every quiz attempt.

ALTER TABLE enrolment
    ADD COLUMN last_lesson_id uuid REFERENCES lesson (id) ON DELETE SET NULL,
    ADD COLUMN last_active_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX enrolment_user_idx ON enrolment (user_id, last_active_at DESC);
CREATE INDEX enrolment_course_idx ON enrolment (course_id);

-- A progress row exists only once the lesson is done, so it always has a time.
UPDATE progress SET completed_at = now() WHERE completed_at IS NULL;
ALTER TABLE progress
    ALTER COLUMN completed_at SET DEFAULT now(),
    ALTER COLUMN completed_at SET NOT NULL;
CREATE INDEX progress_lesson_idx ON progress (lesson_id);

-- Every attempt is kept. Passing one is what marks a quiz lesson done.
CREATE TABLE quiz_attempt (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id  uuid NOT NULL REFERENCES enrolment (id) ON DELETE CASCADE,
    lesson_id     uuid NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
    correct       integer NOT NULL CHECK (correct >= 0),
    total         integer NOT NULL CHECK (total > 0),
    score_percent integer NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
    passed        boolean NOT NULL,
    -- Question id to the option id that was picked, as submitted.
    answers       jsonb NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (correct <= total)
);
CREATE INDEX quiz_attempt_idx ON quiz_attempt (enrolment_id, lesson_id, created_at DESC);
