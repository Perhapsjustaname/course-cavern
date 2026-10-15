export const INDUSTRIES = [
  'Electrical',
  'Plumbing',
  'Carpentry',
  'HVAC',
  'Welding',
  'Automotive',
  'Construction',
  'Healthcare',
  'Accounting',
  'Law',
  'Real estate',
  'Software development',
  'Data and analytics',
  'Design',
  'Marketing',
  'Project management',
  'Culinary',
  'Fitness',
  'Aviation',
  'Other',
] as const;

export const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export const LESSON_KINDS = [
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'pdf', label: 'PDF' },
  { value: 'text', label: 'Reading' },
  { value: 'quiz', label: 'Quiz' },
] as const;

export const CREDENTIAL_KINDS = [
  { value: 'licence', label: 'Licence' },
  { value: 'certification', label: 'Certification' },
  { value: 'employment', label: 'Employment record' },
] as const;

/** Documents an instructor can upload as evidence. */
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;
export const MAX_CREDENTIALS_PER_SUBMIT = 5;

export type LessonKind = (typeof LESSON_KINDS)[number]['value'];
export type Level = (typeof LEVELS)[number]['value'];
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number]['value'];
