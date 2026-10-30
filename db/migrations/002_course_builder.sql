-- Course builder: rich text, uploaded media, quizzes and course thumbnails.

-- ------------------------------------------------------------------ course --

ALTER TABLE course ADD COLUMN thumbnail_key text;

-- Descriptions are rich text (sanitised HTML) from here on. Turn any existing
-- plain text into escaped paragraphs so it displays the same as before.
UPDATE course
   SET description = '<p>' ||
       replace(replace(replace(replace(description, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
               E'\n', '</p><p>') || '</p>'
 WHERE description IS NOT NULL AND description <> '';

-- ----------------------------------------------------------------- section --

ALTER TABLE section ADD COLUMN description text;
ALTER TABLE section ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- ------------------------------------------------------------------ lesson --

-- description: rich text shown above every kind of lesson
-- body:        rich text, the content of a reading lesson
-- file_*:      the uploaded video, audio or PDF; content_key is where it lives
ALTER TABLE lesson ADD COLUMN description text;
ALTER TABLE lesson ADD COLUMN body text;
ALTER TABLE lesson ADD COLUMN file_name text;
ALTER TABLE lesson ADD COLUMN mime_type text;
ALTER TABLE lesson ADD COLUMN size_bytes bigint CHECK (size_bytes > 0);
ALTER TABLE lesson ADD COLUMN is_preview boolean NOT NULL DEFAULT false;
ALTER TABLE lesson ADD COLUMN pass_percent integer CHECK (pass_percent BETWEEN 0 AND 100);
ALTER TABLE lesson ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- A file is all or nothing: never a key without its details, or the reverse.
ALTER TABLE lesson ADD CONSTRAINT lesson_file_complete CHECK (
    (content_key IS NULL AND file_name IS NULL AND mime_type IS NULL AND size_bytes IS NULL) OR
    (content_key IS NOT NULL AND file_name IS NOT NULL AND mime_type IS NOT NULL AND size_bytes IS NOT NULL)
);

-- ------------------------------------------------------------------- quiz --

CREATE TABLE quiz_question (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id  uuid NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
    prompt     text NOT NULL,
    position   integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT quiz_question_position_unique UNIQUE (lesson_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE quiz_option (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES quiz_question (id) ON DELETE CASCADE,
    text        text NOT NULL CHECK (length(text) BETWEEN 1 AND 500),
    is_correct  boolean NOT NULL DEFAULT false,
    explanation text,
    position    integer NOT NULL,
    CONSTRAINT quiz_option_position_unique UNIQUE (question_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- The database itself refuses a second correct answer on the same question.
-- "At least one" is checked when the question is saved.
CREATE UNIQUE INDEX quiz_option_one_correct ON quiz_option (question_id) WHERE is_correct;
