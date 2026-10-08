/**
 * The organic blur shapes that give MD3 its atmosphere. Purely decorative, so
 * it is hidden from assistive tech and never intercepts a pointer.
 */
export function BlurField({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-md-primary/20 blur-3xl" />
      <div className="absolute -right-32 top-10 h-[28rem] w-[28rem] rounded-[100px] rounded-tr-[20px] bg-md-tertiary/15 mix-blend-multiply blur-3xl" />
      <div className="absolute bottom-[-10rem] left-1/3 h-80 w-80 rounded-full bg-md-secondary-container/60 blur-3xl" />
    </div>
  );
}
