import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isUuid } from '@/lib/ids';
import { getPublicInstructor, getVerifiedCredentials, listInstructorCourses } from '@/lib/learning';
import { CatalogueCard } from '@/components/learn/catalogue-card';
import { InstructorCard } from '@/components/learn/instructor-card';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const instructor = isUuid(id) ? await getPublicInstructor(id) : null;
  return { title: instructor ? `${instructor.display_name} | Course Cavern` : 'Instructor | Course Cavern' };
}

export default async function InstructorPage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const instructor = await getPublicInstructor(id);
  if (!instructor) notFound();
  const [credentials, courses] = await Promise.all([getVerifiedCredentials(id), listInstructorCourses(id)]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <p className="text-label-md font-medium text-md-primary">Instructor</p>
      <h1 className="mt-1 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">{instructor.display_name}</h1>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_1.2fr]">
        <InstructorCard
          instructor={{
            name: instructor.display_name,
            headline: instructor.headline,
            years: instructor.years_experience,
            industry: instructor.industry,
            verifiedAt: instructor.verified_at,
          }}
          credentials={credentials}
        />
        {instructor.bio ? (
          <section className="rounded-md3-xl bg-md-surface-container-low/60 p-6 sm:p-7">
            <h2 className="text-title-lg">About</h2>
            <p className="mt-3 text-body-md whitespace-pre-line text-md-on-surface-variant">{instructor.bio}</p>
          </section>
        ) : null}
      </div>

      <section className="mt-14">
        <h2 className="text-[1.75rem] font-medium tracking-tight sm:text-headline-md">Courses</h2>
        {courses.length ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CatalogueCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-body-md text-md-on-surface-variant">No courses live yet.</p>
        )}
      </section>
    </div>
  );
}
