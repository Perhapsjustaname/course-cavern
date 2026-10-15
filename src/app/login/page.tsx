import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell, AsideSteps } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser, homeFor, safeNext } from '@/lib/dal';

export const metadata: Metadata = { title: 'Sign in | Course Cavern' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next) ?? undefined;
  const user = await getCurrentUser();
  if (user) redirect(next ?? homeFor(user));

  return (
    <AuthShell
      title="Sign in"
      intro="Students, instructors and reviewers all use the same sign in."
      aside={
        <AsideSteps
          heading="Every instructor here was checked by a person."
          steps={[
            'They sent in licences, certificates or proof of employment.',
            'A reviewer read the evidence against what they claimed.',
            'What passed is listed on their profile, with the date it was checked.',
          ]}
        />
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
