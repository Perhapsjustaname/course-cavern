import * as z from 'zod';
import { CREDENTIAL_KINDS, INDUSTRIES, LESSON_KINDS, LEVELS } from '@/lib/constants';

/**
 * Zod 4's z.coerce.number() turns a blank field into 0, which would silently
 * save "years of experience" or a price as zero. Blank means "not given".
 */
const blankToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const optionalText = (max: number, msg: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, msg).optional());

const optionalDate = z.preprocess(
  blankToUndefined,
  z.iso.date({ error: 'Use a full date.' }).optional(),
);

const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((x) => x.value) as [T[number]['value'], ...T[number]['value'][]];

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(100, 'That name is too long.'),
  email: z.email('Enter a valid email address.').transform((e) => e.toLowerCase()),
  password: z
    .string()
    .min(10, 'Use at least 10 characters.')
    .max(200, 'That password is too long.'),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').transform((e) => e.toLowerCase()),
  password: z.string().min(1, 'Enter your password.'),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter the name students will see.').max(100),
  headline: z
    .string()
    .trim()
    .min(5, 'Add a short line about what you do.')
    .max(120, 'Keep the headline under 120 characters.'),
  industry: z.enum(INDUSTRIES, { error: 'Pick the industry you work in.' }),
  yearsExperience: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: 'Enter a number of years.' })
      .int('Use a whole number of years.')
      .min(0, 'Years cannot be negative.')
      .max(80, 'That looks like too many years.'),
  ),
  bio: z
    .string()
    .trim()
    .min(40, 'Tell reviewers a bit more, at least a few sentences.')
    .max(2000, 'Keep this under 2,000 characters.'),
});

export const credentialSchema = z.object({
  kind: z.enum(values(CREDENTIAL_KINDS), { error: 'Pick what kind of evidence this is.' }),
  title: z.string().trim().min(3, 'Give this document a name.').max(150),
  issuer: optionalText(150, 'Keep the issuer under 150 characters.'),
  issuedOn: optionalDate,
  expiresOn: optionalDate,
});

export const courseSchema = z.object({
  title: z.string().trim().min(5, 'Give the course a title.').max(120, 'Keep the title under 120 characters.'),
  summary: z
    .string()
    .trim()
    .min(20, 'Write a sentence or two about what students will learn.')
    .max(300, 'Keep the summary under 300 characters.'),
  description: optionalText(5000, 'Keep the description under 5,000 characters.'),
  industry: z.enum(INDUSTRIES, { error: 'Pick an industry.' }),
  level: z.enum(values(LEVELS), { error: 'Pick a level.' }),
  price: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: 'Enter a price, or 0 for free.' })
      .min(0, 'Price cannot be negative.')
      .max(5000, 'Prices above $5,000 need an admin to set them.')
      // Reject sub-cent amounts like 19.999. The tolerance absorbs float noise.
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, {
        message: 'Use dollars and cents, like 49.99.',
      }),
  ),
});

export const sectionSchema = z.object({
  title: z.string().trim().min(2, 'Name the section.').max(120, 'Keep this under 120 characters.'),
});

export const lessonSchema = z.object({
  title: z.string().trim().min(2, 'Name the lesson.').max(150, 'Keep this under 150 characters.'),
  kind: z.enum(values(LESSON_KINDS), { error: 'Pick a lesson type.' }),
  durationMinutes: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: 'Enter minutes as a number.' })
      .int('Use whole minutes.')
      .min(1, 'At least 1 minute.')
      .max(600, 'Ten hours is the limit for one lesson.')
      .optional(),
  ),
});

export const decisionNoteSchema = z.preprocess(blankToUndefined, z.string().trim().max(2000).optional());

export type FieldErrors = Record<string, string[] | undefined>;

/** Pull the first message per field, in the shape the forms render. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/** FormData values as plain strings; files and missing keys become ''. */
export function formText(form: FormData, ...keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = form.get(k);
    out[k] = typeof v === 'string' ? v : '';
  }
  return out;
}
