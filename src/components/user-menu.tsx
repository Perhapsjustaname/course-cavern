'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { logout } from '@/app/actions/auth';

type Item = { href: string; label: string };

export function UserMenu({ name, email, items }: { name: string; email: string; items: Item[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-full bg-md-secondary-container text-label-md font-bold text-md-on-secondary-container transition-all duration-200 ease-md3 hover:shadow-md active:scale-95"
      >
        <span className="sr-only">Account menu for {name}</span>
        <span aria-hidden="true">{initials || '?'}</span>
      </button>

      <div
        id={menuId}
        role="menu"
        hidden={!open}
        className="absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-md3-lg bg-md-surface-container p-2 shadow-lg ring-1 ring-md-outline/10"
      >
        <div className="px-3 pt-2 pb-3">
          <p className="truncate text-body-md font-medium text-md-on-surface">{name}</p>
          <p className="truncate text-label-sm text-md-on-surface-variant">{email}</p>
        </div>
        <div className="my-1 h-px bg-md-outline/15" />
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-full px-3 py-2.5 text-label-md font-medium text-md-on-surface transition-colors duration-200 hover:bg-md-primary/10"
          >
            {item.label}
          </Link>
        ))}
        <form action={logout}>
          <button
            type="submit"
            role="menuitem"
            className="w-full rounded-full px-3 py-2.5 text-left text-label-md font-medium text-md-on-surface transition-colors duration-200 hover:bg-md-primary/10"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
