'use client';

import { startTransition, useActionState, useCallback, type FormEvent } from 'react';

/**
 * Submit a form to a Server Action without React's automatic post-action form
 * reset. Two reasons:
 *
 * - On a validation error the reset would wipe what the person typed, and a
 *   file input cannot be refilled at all.
 * - A rich text editor keeps its content in its own state and mirrors it into
 *   a hidden input. The reset would put that input back to its first value
 *   while the editor still shows the new text, so the next save would quietly
 *   store the old content.
 */
export function useFormAction<S>(action: (state: S, form: FormData) => Promise<S>, initial: S) {
  // React types state as Awaited<S>; for these plain-object states the two are
  // the same, which TypeScript cannot prove for a generic S.
  const [state, dispatch, pending] = useActionState<S, FormData>(
    action as (state: Awaited<S>, form: FormData) => Promise<S>,
    initial as Awaited<S>,
  );
  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      startTransition(() => dispatch(data));
    },
    [dispatch],
  );
  return { state: state as S, pending, onSubmit };
}
