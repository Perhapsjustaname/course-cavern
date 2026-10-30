'use client';

import Form from 'next/form';
import Link from 'next/link';
import type { ChangeEvent, FormEvent } from 'react';
import { SelectField, TextField } from '@/components/form/field';
import { Button } from '@/components/button';
import { INDUSTRIES, LEVELS } from '@/lib/constants';
import type { CatalogueFilters } from '@/lib/learning';

const INDUSTRY_OPTIONS = [{ value: '', label: 'Any industry' }, ...INDUSTRIES.map((i) => ({ value: i, label: i }))];
const LEVEL_OPTIONS = [{ value: '', label: 'Any level' }, ...LEVELS];
const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

/**
 * Blank fields are switched off for the moment the form is read, so the URL
 * carries only the filters actually in use.
 */
function dropBlanks(e: FormEvent<HTMLFormElement>) {
  const blanks = [...e.currentTarget.elements].filter(
    (el): el is HTMLInputElement | HTMLSelectElement =>
      (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.name !== '' && el.value.trim() === '',
  );
  blanks.forEach((el) => (el.disabled = true));
  setTimeout(() => blanks.forEach((el) => (el.disabled = false)));
}

const submitOnChange = (e: ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();

export function FilterBar({ filters }: { filters: CatalogueFilters }) {
  const filtered = Boolean(filters.q || filters.industry || filters.level || filters.price);
  return (
    <Form
      action="/courses"
      onSubmit={dropBlanks}
      scroll={false}
      className="rounded-md3-xl bg-md-surface-container p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <TextField
          label="Search"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="A skill, a trade or an instructor"
          maxLength={100}
        />
        <SelectField label="Industry" name="industry" options={INDUSTRY_OPTIONS} defaultValue={filters.industry ?? ''} onChange={submitOnChange} />
        <SelectField label="Level" name="level" options={LEVEL_OPTIONS} defaultValue={filters.level ?? ''} onChange={submitOnChange} />
        <SelectField label="Price" name="price" options={PRICE_OPTIONS} defaultValue={filters.price ?? ''} onChange={submitOnChange} />
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {filtered ? (
          <Link href="/courses" scroll={false} className="rounded-full px-4 py-2 text-label-md font-medium text-md-primary hover:bg-md-primary/10">
            Clear filters
          </Link>
        ) : null}
        <Button type="submit" size="sm">
          Search
        </Button>
      </div>
    </Form>
  );
}
