import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireInstructor } from '@/lib/dal';
import { countStudents, getOwnedCourse, isEditable } from '@/lib/courses';
import { isUuid } from '@/lib/ids';
import { deleteCourse } from '@/app/actions/courses';
import { DetailsForm } from '@/components/course/course-forms';
import { ThumbnailUploader } from '@/components/course/thumbnail-uploader';
import { PasswordConfirm } from '@/components/course/password-confirm';
import { Notice } from '@/components/notice';

export const metadata: Metadata = { title: 'Course details | Course Cavern' };

export default async function DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { instructor } = await requireInstructor(`/instructor/courses/${id}/details`);
  if (!isUuid(id)) notFound();
  const course = await getOwnedCourse(id, instructor.id);
  if (!course) notFound();
  const editable = isEditable(course.status);
  const students = await countStudents(course.id);

  return (
    <div className="flex flex-col gap-8">
      {!editable ? (
        <Notice tone="info">
          {course.status === 'published'
            ? 'This course is live, so its details are locked. Take it offline from the Curriculum tab to change them.'
            : 'This course is with a reviewer, so its details are locked. Withdraw it from the Curriculum tab to change them.'}
        </Notice>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-md3-2xl bg-md-surface-container p-6 shadow-sm sm:p-8">
          <h2 className="text-title-lg">About the course</h2>
          <div className="mt-6">
            <DetailsForm
              courseId={course.id}
              editable={editable}
              defaults={{
                title: course.title,
                summary: course.summary ?? '',
                description: course.description,
                industry: course.industry ?? '',
                level: course.level ?? '',
              }}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <section className="rounded-md3-2xl bg-md-surface-container p-6 shadow-sm">
            <h2 className="text-title-lg">Thumbnail</h2>
            <p className="mt-1 text-label-md text-md-on-surface-variant">
              The first thing people see in the catalogue. A clear photo of the work beats a logo.
            </p>
            <div className="mt-5">
              <ThumbnailUploader
                courseId={course.id}
                editable={editable}
                current={course.thumbnail_key ? `/api/courses/${course.id}/thumbnail?v=${new Date(course.updated_at).getTime()}` : null}
              />
            </div>
          </section>
        </aside>
      </div>

      {editable && students ? (
        <section className="rounded-md3-lg border border-md-outline/25 p-6">
          <p className="text-body-md font-medium">This course cannot be deleted</p>
          <p className="mt-0.5 text-label-md text-md-on-surface-variant">
            {students === 1 ? 'A student is' : `${students} students are`} enrolled, and they keep access to what they
            signed up for. Change it here and send it for review again instead.
          </p>
        </section>
      ) : editable ? (
        <section className="flex flex-col gap-4 rounded-md3-lg border border-md-error/25 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-body-md font-medium">Delete this course</p>
            <p className="mt-0.5 text-label-md text-md-on-surface-variant">
              Every section, lesson, upload and quiz goes with it. This cannot be undone.
            </p>
          </div>
          <PasswordConfirm
            action={deleteCourse.bind(null, course.id)}
            triggerLabel="Delete course"
            title="Delete this course for good?"
            confirmLabel="Delete it"
          >
            <strong className="font-medium text-md-on-surface">{course.title}</strong> and everything in it will be
            removed, including uploaded videos and files. There is no undo.
          </PasswordConfirm>
        </section>
      ) : null}
    </div>
  );
}
