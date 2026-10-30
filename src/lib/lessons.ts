/**
 * Lesson rules that both the server and the browser need. No database access
 * here, so client components can import it.
 */
import { isMediaKind } from '@/lib/media';

export type LessonKind = 'video' | 'audio' | 'pdf' | 'text' | 'quiz';

/** Does this lesson have the thing its kind needs? */
export function lessonHasContent(l: { kind: string; content_key: string | null; body: string | null; question_count: number }) {
  if (isMediaKind(l.kind)) return l.content_key !== null;
  if (l.kind === 'text') return l.body !== null;
  return l.question_count > 0;
}

export const MISSING_CONTENT: Record<LessonKind, string> = {
  video: 'No video uploaded',
  audio: 'No audio uploaded',
  pdf: 'No PDF uploaded',
  text: 'Nothing written yet',
  quiz: 'No questions yet',
};
