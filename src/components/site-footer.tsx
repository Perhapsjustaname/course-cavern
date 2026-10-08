import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-md-outline/15">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-10 text-label-md text-md-on-surface-variant sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Course Cavern. Built by team HARM.</p>
        <Link
          href="/development"
          className="rounded-full text-md-primary transition-opacity duration-200 hover:opacity-70"
        >
          Development notes
        </Link>
      </div>
    </footer>
  );
}
