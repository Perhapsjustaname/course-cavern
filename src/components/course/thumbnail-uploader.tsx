'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { removeThumbnail } from '@/app/actions/courses';
import { ConfirmDelete } from '@/components/course/controls';
import { fileHead, uploadFile } from '@/components/course/upload';
import { THUMBNAIL_MAX_BYTES, THUMBNAIL_TYPES, bytesMatch, canonicalType } from '@/lib/media';
import { cn } from '@/lib/cn';

const MAX_EDGE = 1600;

/**
 * Shrink a photo before it leaves the browser. A phone picture is often 10 MB
 * or more; at 1600 pixels across as WebP it is usually a few hundred KB.
 * Safari cannot always encode WebP, so JPEG is the fallback.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  const webp = await encode('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  return (await encode('image/jpeg')) ?? file;
}

export function ThumbnailUploader({ courseId, current, editable }: { courseId: string; current: string | null; editable: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The resized image, shown while it uploads. It belongs to the server image
  // it is replacing, so once the page has a different one (the new upload, or
  // none after removing it) the local copy stops showing.
  const [preview, setPreview] = useState<{ url: string; over: string | null } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    const type = canonicalType(file.type, file.name);
    if (!THUMBNAIL_TYPES[type] || !bytesMatch(type, await fileHead(file))) {
      setError('Use a JPG, PNG or WebP image.');
      return;
    }
    let blob: Blob;
    try {
      blob = await shrink(file);
    } catch {
      setError('That image could not be read. Try a different one.');
      return;
    }
    if (blob.size > THUMBNAIL_MAX_BYTES) {
      setError('That image is still too large after resizing. Try a smaller one.');
      return;
    }
    setPreview({ url: URL.createObjectURL(blob), over: current });
    setProgress(0);
    const { promise } = uploadFile(`/api/courses/${courseId}/thumbnail`, blob, { 'Content-Type': blob.type }, setProgress);
    const result = await promise;
    setProgress(null);
    if (!result.ok) {
      setPreview(null);
      setError(result.message);
      return;
    }
    router.refresh();
  }

  const shown = preview && preview.over === current ? preview.url : current;

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (!editable) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!editable) return;
          e.preventDefault();
          setDragging(false);
          void pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-md3-lg transition-all duration-200 ease-md3',
          shown ? 'bg-md-surface-container-low' : 'border-2 border-dashed',
          dragging ? 'border-md-primary bg-md-primary/10' : 'border-md-outline/40',
        )}
      >
        {shown ? (
          // Plain <img>: the image optimiser would fetch without the viewer's cookies.
          <img src={shown} alt="Course thumbnail" className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            disabled={!editable}
            onClick={() => input.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-3 text-md-on-surface-variant transition-colors duration-200 hover:bg-md-primary/5 hover:text-md-primary"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-md-secondary-container text-md-on-secondary-container">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <circle cx="9" cy="10" r="1.6" />
                <path d="m21 15.5-5-4.5-8.5 8" />
              </svg>
            </span>
            <span className="text-body-md font-medium">Choose an image or drop it here</span>
            <span className="text-label-sm">Landscape works best. It is resized for you.</span>
          </button>
        )}
        {progress !== null ? (
          <div className="absolute inset-x-0 bottom-0 bg-md-on-surface/60 px-4 py-3 text-label-md text-md-background backdrop-blur-sm">
            Uploading {Math.round(progress * 100)}%
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all duration-200" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error ? <p role="alert" className="mt-2 px-1 text-label-md text-md-error">{error}</p> : null}
      {editable && shown && progress === null ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="rounded-full px-4 py-2 text-label-md font-medium text-md-primary transition-all duration-200 ease-md3 hover:bg-md-primary/10 active:scale-95"
          >
            Replace image
          </button>
          {current ? <ConfirmDelete action={removeThumbnail.bind(null, courseId)} what="image" /> : null}
        </div>
      ) : null}
    </div>
  );
}
