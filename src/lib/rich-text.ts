import 'server-only';
import sanitizeHtml from 'sanitize-html';

/**
 * Rich text arrives as HTML from the editor, which means it arrives from the
 * browser and cannot be trusted. Everything is cleaned against this allowlist
 * before it is stored, and again when it is shown.
 *
 * The list matches what the editor can produce. Anything else, a <script>, an
 * onclick, a javascript: link, is dropped rather than escaped.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
  // target and rel are allowed only so the transform below can set them; it
  // overwrites whatever the input carried.
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  // Links always open in a new tab and pass no referrer or ranking signal.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
  },
};

const TEXT_ONLY: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {} };

const EMPTY_P = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*/y;

/**
 * Pressing Enter at the end of the editor leaves empty paragraphs that show as
 * a gap. Drop them from both ends, one paragraph at a time, so a body made of
 * nothing but empty paragraphs costs a single pass and not a regex backtrack.
 */
function trimEmptyParagraphs(html: string): string {
  let start = 0;
  let end = html.length;
  for (;;) {
    EMPTY_P.lastIndex = start;
    const m = EMPTY_P.exec(html);
    if (!m) break;
    start += m[0].length;
  }
  while (end > start) {
    const open = html.lastIndexOf('<p>', end - 1);
    if (open < start) break;
    EMPTY_P.lastIndex = open;
    const m = EMPTY_P.exec(html);
    // Only an empty paragraph that runs right up to the end counts. One inside
    // a list or quote stops the trim.
    if (!m || open + m[0].length !== end) break;
    end = open;
  }
  return html.slice(start, end);
}

export function sanitizeRichText(html: string): string {
  return trimEmptyParagraphs(sanitizeHtml(html, OPTIONS).trim());
}

/** The words, with markup removed. Used for length limits and emptiness. */
export function richTextToPlain(html: string): string {
  return sanitizeHtml(html.replace(/<\/(p|h2|h3|li|blockquote)>/g, '$& '), TEXT_ONLY)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export type CleanRichText =
  | { ok: true; html: string | null; length: number }
  | { ok: false; error: string };

/**
 * Clean a submitted value and check it. An editor with nothing typed in it
 * still sends "<p></p>", so blank means no words, not no characters.
 */
export function cleanRichText(
  value: unknown,
  { max, required, label }: { max: number; required?: boolean; label: string },
): CleanRichText {
  // Markup roughly doubles the size of the words. Anything far past that is
  // not from the editor, so refuse it before spending time parsing it.
  if (typeof value === 'string' && value.length > max * 20 + 10_000) {
    return { ok: false, error: `Keep the ${label} under ${max.toLocaleString('en-CA')} characters.` };
  }
  const html = typeof value === 'string' ? sanitizeRichText(value) : '';
  const text = richTextToPlain(html);
  if (!text) {
    return required ? { ok: false, error: `Add some text to the ${label}.` } : { ok: true, html: null, length: 0 };
  }
  if (text.length > max) {
    return { ok: false, error: `Keep the ${label} under ${max.toLocaleString('en-CA')} characters. It is ${text.length.toLocaleString('en-CA')} now.` };
  }
  return { ok: true, html, length: text.length };
}
