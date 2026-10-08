import type { Metadata } from 'next';
import { Card } from '@/components/card';
import { BlurField } from '@/components/blur-field';
import { SCHEMA_GROUPS, SCHEMA_NOTES, TABLE_COUNT, type Column } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Development | Course Cavern',
  description: 'Database structure and build notes for Course Cavern.',
};

const KEY_LABEL: Record<NonNullable<Column['key']>, string> = {
  pk: 'PK',
  fk: 'FK',
  unique: 'UQ',
};

const KEY_STYLE: Record<NonNullable<Column['key']>, string> = {
  pk: 'bg-md-primary text-md-on-primary',
  fk: 'bg-md-secondary-container text-md-on-secondary-container',
  unique: 'bg-md-tertiary/15 text-md-tertiary',
};

function KeyChip({ k }: { k: NonNullable<Column['key']> }) {
  return (
    <span
      className={`inline-grid h-5 min-w-[1.75rem] place-items-center rounded-full px-1.5 text-[0.65rem] font-bold tracking-wide ${KEY_STYLE[k]}`}
    >
      {KEY_LABEL[k]}
    </span>
  );
}

export default function DevelopmentPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <section className="relative mt-6 overflow-hidden rounded-md3-2xl bg-md-surface-container px-6 py-14 shadow-sm sm:rounded-md3-3xl sm:px-14 sm:py-16">
        <BlurField />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-md-secondary-container px-4 py-1.5 text-label-sm font-medium tracking-[0.01em] text-md-on-secondary-container">
            Internal
          </span>
          <h1 className="mt-6 text-[2rem] leading-tight font-medium tracking-tight sm:text-headline-lg">
            Database structure
          </h1>
          <p className="mt-5 text-body-lg text-md-on-surface-variant">
            {TABLE_COUNT} tables across four areas. This page is a working reference for the team
            and will come down before launch. The executable version lives in{' '}
            <code className="rounded-md3-xs bg-md-surface-container-low px-1.5 py-0.5 text-[0.9em] break-words">
              db/migrations/001_init.sql
            </code>
            .
          </p>
        </div>
      </section>

      {SCHEMA_GROUPS.map((group) => (
        <section key={group.name} className="pt-16">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-[1.75rem] font-medium tracking-tight sm:text-headline-md">
              {group.name}
            </h2>
            <span className="text-label-md text-md-on-surface-variant">
              {group.tables.length} {group.tables.length === 1 ? 'table' : 'tables'}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-body-md text-md-on-surface-variant">{group.blurb}</p>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {group.tables.map((table) => (
              <Card key={table.name} interactive className="flex flex-col">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-mono text-title-lg tracking-tight text-md-primary">
                    {table.name}
                  </h3>
                  <span className="rounded-full bg-md-surface-container-low px-3 py-1 text-label-sm text-md-on-surface-variant">
                    {table.columns.length} columns
                  </span>
                </div>
                <p className="mt-2 text-body-md text-md-on-surface-variant">{table.purpose}</p>

                <ul className="mt-5 flex flex-col gap-px overflow-hidden rounded-md3-sm bg-md-outline/10">
                  {table.columns.map((col) => (
                    <li
                      key={col.name}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-md-surface-container px-3.5 py-2.5 transition-colors duration-200 hover:bg-md-surface-container-low"
                    >
                      <span className="font-mono text-label-md text-md-on-surface">{col.name}</span>
                      <span className="font-mono text-label-sm text-md-on-surface-variant/80">
                        {col.type}
                      </span>
                      {col.key ? <KeyChip k={col.key} /> : null}
                      {col.note ? (
                        <span className="ml-auto text-label-sm text-md-on-surface-variant">
                          {col.note}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <section className="pt-16">
        <div className="relative overflow-hidden rounded-md3-2xl bg-md-primary px-6 py-12 text-md-on-primary shadow-lg sm:rounded-md3-3xl sm:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute -bottom-28 -left-10 h-72 w-72 rounded-[100px] rounded-tr-[20px] bg-md-tertiary/40 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-[1.75rem] font-medium tracking-tight sm:text-headline-md">
              Decisions worth knowing
            </h2>
            <ul className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {SCHEMA_NOTES.map((note, i) => (
                <li
                  key={note}
                  className="flex gap-4 rounded-md3-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm transition-all duration-300 ease-md3 hover:border-white/25 hover:bg-white/15"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-label-sm font-bold"
                  >
                    {i + 1}
                  </span>
                  <p className="text-body-md text-md-on-primary/90">{note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="pt-16">
        <Card>
          <h2 className="text-title-lg">Running it locally</h2>
          <p className="mt-2 text-body-md text-md-on-surface-variant">
            The app has no database connection yet, so it starts with nothing installed beyond the
            node modules.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-md3-sm bg-md-on-surface px-5 py-4 font-mono text-label-md text-md-background">
            <code>{'npm install\nnpm run dev'}</code>
          </pre>
          <p className="mt-4 text-body-md text-md-on-surface-variant">
            Then open{' '}
            <code className="rounded-md3-xs bg-md-surface-container-low px-1.5 py-0.5">
              http://localhost:3000
            </code>
            .
          </p>
        </Card>
      </section>
    </div>
  );
}
