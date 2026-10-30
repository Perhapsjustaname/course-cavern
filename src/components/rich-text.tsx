import { sanitizeRichText } from '@/lib/rich-text';
import { cn } from '@/lib/cn';

/**
 * Shows stored rich text. It was cleaned on the way in; it is cleaned again
 * here, so a row written some other way still cannot inject markup.
 */
export function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  if (!html) return null;
  return <div className={cn('rich-text text-body-md', className)} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
