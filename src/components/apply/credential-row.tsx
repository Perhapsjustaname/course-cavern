'use client';

import { useRef, useState } from 'react';
import { SelectField, TextField } from '@/components/form/field';
import { CREDENTIAL_KINDS, DOCUMENT_MAX_BYTES, DOCUMENT_TYPES } from '@/lib/constants';
import { formatBytes } from '@/lib/format';
import type { FieldErrors } from '@/lib/validation';
import { cn } from '@/lib/cn';

function checkClientFile(f: File | undefined): string | null {
  if (!f) return null;
  if (f.size > DOCUMENT_MAX_BYTES) return `This file is ${formatBytes(f.size)}. The limit is ${formatBytes(DOCUMENT_MAX_BYTES)}.`;
  if (!(DOCUMENT_TYPES as readonly string[]).includes(f.type)) return 'Upload a PDF, JPG, PNG or WebP file.';
  return null;
}

export function CredentialRow({
  rowId,
  position,
  errors,
  onRemove,
}: {
  rowId: number;
  position: number;
  errors?: FieldErrors;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>();
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const name = (f: string) => `cred.${rowId}.${f}`;
  const fileError = localError ?? errors?.file?.[0];

  function pick(f: File | undefined) {
    setFile(f);
    setLocalError(checkClientFile(f));
  }

  return (
    <fieldset className="rounded-md3-lg bg-md-surface-container p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <legend className="text-title-lg">Document {position + 1}</legend>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full px-3 py-1.5 text-label-md font-medium text-md-on-surface-variant transition-colors duration-200 hover:bg-md-error/10 hover:text-md-error active:scale-95"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="What is it"
          name={name('kind')}
          options={CREDENTIAL_KINDS}
          defaultValue=""
          placeholder="Choose one"
          error={errors?.kind}
        />
        <TextField
          label="Name of the document"
          name={name('title')}
          placeholder="e.g. Master electrician licence"
          error={errors?.title}
        />
        <TextField
          label="Issued by (optional)"
          name={name('issuer')}
          placeholder="Licensing body, school or employer"
          error={errors?.issuer}
          className="sm:col-span-2"
        />
        <TextField label="Issue date (optional)" name={name('issuedOn')} type="date" error={errors?.issuedOn} />
        <TextField label="Expiry date (optional)" name={name('expiresOn')} type="date" error={errors?.expiresOn} />
      </div>

      <div className="mt-5">
        <label
          htmlFor={`f-${name('file')}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped && inputRef.current) {
              const dt = new DataTransfer();
              dt.items.add(dropped);
              inputRef.current.files = dt.files;
              pick(dropped);
            }
          }}
          className={cn(
            'flex cursor-pointer items-center gap-4 rounded-md3-md border-2 border-dashed px-5 py-5 transition-all duration-200 ease-md3',
            fileError
              ? 'border-md-error bg-md-error-container/40'
              : dragging
                ? 'border-md-primary bg-md-primary/10'
                : file
                  ? 'border-md-primary/40 bg-md-primary-container/40'
                  : 'border-md-outline/40 hover:border-md-primary/60 hover:bg-md-primary/5',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full',
              file && !fileError ? 'bg-md-primary text-md-on-primary' : 'bg-md-secondary-container text-md-on-secondary-container',
            )}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {file && !fileError ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" />}
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            {file ? (
              <>
                <span className="block truncate text-body-md font-medium text-md-on-surface">{file.name}</span>
                <span className="block text-label-sm text-md-on-surface-variant">
                  {formatBytes(file.size)}. Click to choose a different file.
                </span>
              </>
            ) : (
              <>
                <span className="block text-body-md font-medium text-md-on-surface">Choose a file or drop it here</span>
                <span className="block text-label-sm text-md-on-surface-variant">
                  PDF, JPG, PNG or WebP, up to {formatBytes(DOCUMENT_MAX_BYTES)}
                </span>
              </>
            )}
          </span>
        </label>
        <input
          ref={inputRef}
          id={`f-${name('file')}`}
          name={name('file')}
          type="file"
          accept={DOCUMENT_TYPES.join(',')}
          aria-invalid={fileError ? true : undefined}
          data-file-error={localError ? 'true' : undefined}
          aria-describedby={fileError ? `f-${name('file')}-msg` : undefined}
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {fileError ? (
          <p id={`f-${name('file')}-msg`} className="mt-1.5 px-4 text-label-sm text-md-error">
            {fileError}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
