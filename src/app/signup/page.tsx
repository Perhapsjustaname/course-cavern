import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell, AsideSteps } from '@/components/auth/auth-shell';
import { SignupForm } from '@/components/auth/signup-form';
import { getCurrentUser, homeFor, safeNext } from '@/lib/dal';

export const metadata: Metadata = { title: 'Create an account | Course Cavern' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignupPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next) ?? undefined;
  const user = await getCurrentUser();
  if (user) redirect(next ?? homeFor(user));

  const teaching = next === '/apply';

  return (
    <AuthShell
      title={teaching ? 'Start your application' : 'Create your account'}
      intro={
        teaching
          ? 'First an account, then the application itself. It takes about ten minutes if your documents are to hand.'
          : 'One account works whether you are here to learn or to teach.'
      }
      aside={
        teaching ? (
          <AsideSteps
            heading="What applying involves"
            steps={[
              'Tell us about your work and how long you have been doing it.',
              'Upload proof: a licence, a certification, or an employment record.',
              'A reviewer checks it, usually within a few working days.',
              'Once approved, your courses can go live.',
            ]}
          />
        ) : (
          <AsideSteps
            heading="How learning here works"
            steps={[
              'Find a course. Its page lists every lesson and what was checked about the instructor.',
              'Try any free preview lessons before you commit.',
              'Enrol and work through it at your own pace.',
              'Your progress is saved, so you can stop and pick it up again later.',
            ]}
          />
        )
      }
    >
      <SignupForm next={next} />
    </AuthShell>
  );
}
