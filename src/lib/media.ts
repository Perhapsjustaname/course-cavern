/**
 * What can be uploaded as lesson media or a course thumbnail. Shared by the
 * browser, which checks a file the moment it is picked, and the server, which
 * checks again and has the final say.
 */

/**
 * 100 MB. Testers reach the app through a Cloudflare tunnel (npm run share),
 * which refuses request bodies over 100 MB, so anything larger would fail
 * there with a confusing error. Raise this once uploads go straight to object
 * storage instead of through the app.
 */
export const LESSON_MAX_BYTES = 100 * 1024 * 1024;
export const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;

export type MediaKind = 'video' | 'audio' | 'pdf';
export const MEDIA_KINDS: readonly MediaKind[] = ['video', 'audio', 'pdf'];
export const isMediaKind = (k: string): k is MediaKind => (MEDIA_KINDS as readonly string[]).includes(k);

type Rule = {
  /** Canonical MIME type to file extension. */
  types: Record<string, string>;
  /** For the file picker. */
  accept: string;
  /** Shown under the drop area. */
  hint: string;
};

export const MEDIA_RULES: Record<MediaKind, Rule> = {
  video: {
    types: { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' },
    accept: 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov',
    hint: 'MP4, WebM or MOV. MP4 plays on every device.',
  },
  audio: {
    types: { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/ogg': 'ogg' },
    accept: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg',
    hint: 'MP3, M4A, WAV or OGG.',
  },
  pdf: {
    types: { 'application/pdf': 'pdf' },
    accept: 'application/pdf,.pdf',
    hint: 'A PDF students can read or download.',
  },
};

export const THUMBNAIL_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Browsers disagree on audio names, and some report nothing for .m4a or .mov.
const ALIASES: Record<string, string> = {
  'audio/mp3': 'audio/mpeg',
  'audio/x-mp3': 'audio/mpeg',
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
  'application/x-pdf': 'application/pdf',
};
const BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg',
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
};

/** One canonical MIME type for a file, from its reported type or, failing that, its name. */
export function canonicalType(reported: string | null | undefined, fileName = ''): string {
  const t = (reported ?? '').split(';')[0]!.trim().toLowerCase();
  if (t && t !== 'application/octet-stream') return ALIASES[t] ?? t;
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  return BY_EXTENSION[ext] ?? t;
}

const ascii = (head: Uint8Array, at: number, text: string) =>
  [...text].every((ch, i) => head[at + i] === ch.charCodeAt(0));

/**
 * Does the start of the file match what it claims to be? The reported type
 * is whatever the browser says, so the bytes have the last word.
 */
export function bytesMatch(type: string, head: Uint8Array): boolean {
  switch (type) {
    case 'video/mp4':
    case 'audio/mp4':
      return ascii(head, 4, 'ftyp');
    case 'video/quicktime':
      // Modern QuickTime files open with ftyp; older ones with another atom.
      return ['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].some((atom) => ascii(head, 4, atom));
    case 'video/webm':
      return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    case 'audio/mpeg':
      return ascii(head, 0, 'ID3') || (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0);
    case 'audio/wav':
      return ascii(head, 0, 'RIFF') && ascii(head, 8, 'WAVE');
    case 'audio/ogg':
      return ascii(head, 0, 'OggS');
    case 'application/pdf':
      return ascii(head, 0, '%PDF');
    case 'image/jpeg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'image/png':
      return head[0] === 0x89 && ascii(head, 1, 'PNG');
    case 'image/webp':
      return ascii(head, 0, 'RIFF') && ascii(head, 8, 'WEBP');
    default:
      return false;
  }
}

export function formatLimit(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
