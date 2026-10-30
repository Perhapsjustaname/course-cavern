import type { Metadata } from 'next';
import Link from 'next/link';
import { FilterBar } from '@/components/learn/filter-bar';
import { CatalogueCard } from '@/components/learn/catalogue-card';
import { ButtonLink } from '@/components/button';
import { countLiveCourses, listCatalogue, readFilters } from '@/lib/learning';
import { getCurrentUser } from '@/lib/dal';
import { plural } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Browse courses | Course Cavern',
  description: 'Courses from instructors whose licences and work history were checked by a reviewer before they could sell.',
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CataloguePage({ searchParams }: Props) {
  const filters = readFilters(await searchParams);
  const filtered = Boolean(filters.q || filters.industry || filters.level || filters.price);
  const [courses, liveTotal, user] = await Promise.all([listCatalogue(filters), countLiveCourses(), getCurrentUser()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <p className="text-label-md font-medium text-md-primary">Catalogue</p>
      <h1 className="mt-1 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">Browse courses</h1>
      <p className="mt-3 max-w-2xl text-body-lg text-md-on-surface-variant">
        Every instructor here sent in proof of their trade, and a reviewer checked it before they were allowed to sell.
      </p>

      {liveTotal ? (
        <>
          <div className="mt-8">
            {/* Keyed on the filters so the fields reset when "Clear filters" or Back changes them. */}
            <FilterBar key={JSON.stringify(filters)} filters={filters} />
          </div>
          <p className="mt-8 text-label-md text-md-on-surface-variant" aria-live="polite">
            {filtered ? `${plural(courses.length, 'course')} found` : plural(liveTotal, 'course')}
          </p>
        </>
      ) : null}

      {courses.length ? (
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CatalogueCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center rounded-md3-2xl bg-md-surface-container px-6 py-16 text-center">
          <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-md3-lg bg-md-secondary-container text-md-on-secondary-container">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </svg>
          </span>
          {filtered ? (
            <>
              <h2 className="mt-5 text-title-lg">Nothing matches that</h2>
              <p className="mt-2 max-w-sm text-body-md text-md-on-surface-variant">Try a shorter search or fewer filters.</p>
              <Link href="/courses" className="mt-6 rounded-full px-4 py-2 text-label-md font-medium text-md-primary hover:bg-md-primary/10">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-5 text-title-lg">No courses yet</h2>
              <p className="mt-2 max-w-sm text-body-md text-md-on-surface-variant">
                The first ones go live as instructors are approved and their courses pass review.
              </p>
              {!user?.instructor && user?.role !== 'admin' ? (
                <ButtonLink href={user ? '/apply' : '/signup?next=/apply'} variant="tonal" size="lg" className="mt-6">
                  Know a trade? Apply to teach
                </ButtonLink>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
