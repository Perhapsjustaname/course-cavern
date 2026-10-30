'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { cn } from '@/lib/cn';

type Toolbar = 'basic' | 'full';

/**
 * A rich text field in the MD3 filled style. The HTML is mirrored into a
 * hidden input so the surrounding form submits it like any other field; the
 * server cleans it before storing (lib/rich-text.ts).
 *
 * Forms that use this must submit through useFormAction. React's post-action
 * form reset would put the hidden input back to its first value while the
 * editor still shows the new text.
 */
export function RichTextEditor({
  name,
  label,
  defaultValue,
  placeholder,
  maxLength,
  error,
  hint,
  toolbar = 'basic',
  size = 'md',
  disabled = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  maxLength: number;
  error?: string[] | string;
  hint?: ReactNode;
  toolbar?: Toolbar;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}) {
  const id = useId();
  const [html, setHtml] = useState(defaultValue ?? '');
  const msg = Array.isArray(error) ? error[0] : error;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['http', 'https', 'mailto'] },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      CharacterCount.configure({ limit: maxLength }),
    ],
    content: defaultValue || '',
    editable: !disabled,
    // Rendering on the server would not match the client and trip hydration.
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': `${id}-label`,
        ...(msg || hint ? { 'aria-describedby': `${id}-msg` } : {}),
        ...(msg ? { 'aria-invalid': 'true' } : {}),
        class: cn(
          'rich-text px-4 pt-1 pb-3 text-body-md outline-none',
          size === 'sm' ? 'min-h-[4.5rem]' : size === 'lg' ? 'min-h-[18rem]' : 'min-h-[8rem]',
        ),
      },
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const count =
    useEditorState({
      editor,
      selector: ({ editor }) => (editor ? (editor.storage.characterCount.characters() as number) : 0),
    }) ?? 0;

  return (
    <div className="group">
      <div
        className={cn(
          'rounded-t-md3-sm border-b-2 bg-md-surface-container-low transition-colors duration-200 ease-md3',
          msg ? 'border-md-error' : 'border-md-outline focus-within:border-md-primary',
          disabled && 'opacity-70',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2.5">
          <span
            id={`${id}-label`}
            className={cn(
              'text-label-sm font-medium transition-colors duration-200',
              msg ? 'text-md-error' : 'text-md-on-surface-variant group-focus-within:text-md-primary',
            )}
          >
            {label}
          </span>
          {editor && !disabled ? <ToolbarButtons editor={editor} kind={toolbar} /> : null}
        </div>
        <EditorContent editor={editor} />
        {!editor ? <div className={cn('px-4 pb-3', size === 'sm' ? 'min-h-[4.5rem]' : size === 'lg' ? 'min-h-[18rem]' : 'min-h-[8rem]')} /> : null}
      </div>
      <input type="hidden" name={name} value={html} />
      <div className="mt-1.5 flex items-start justify-between gap-4 px-4">
        <p id={`${id}-msg`} className={cn('text-label-sm', msg ? 'text-md-error' : 'text-md-on-surface-variant')}>
          {msg ?? hint}
        </p>
        <p
          className={cn(
            'shrink-0 text-label-sm tabular-nums',
            count >= maxLength ? 'text-md-error' : 'text-md-on-surface-variant/70',
          )}
        >
          {count.toLocaleString('en-CA')} / {maxLength.toLocaleString('en-CA')}
        </p>
      </div>
    </div>
  );
}

function ToolbarButtons({ editor, kind }: { editor: Editor; kind: Toolbar }) {
  // Tiptap 3 no longer re-renders on every keystroke, so the active states are
  // read through useEditorState or the buttons would never light up.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [linking, setLinking] = useState(false);

  return (
    <div className="relative">
      <div role="toolbar" aria-label="Formatting" className="-mr-2 flex flex-wrap items-center gap-0.5">
        <Tool label="Bold" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <path d="M7 5h4.5a2.75 2.75 0 0 1 0 5.5H7zm0 5.5h5.25a2.75 2.75 0 0 1 0 5.5H7z" />
        </Tool>
        <Tool label="Italic" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <path d="M11.5 5H15M5 15h3.5M12.75 5l-5.5 10" />
        </Tool>
        {kind === 'full' ? (
          <>
            <Divider />
            <TextTool label="Heading" active={s.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </TextTool>
            <TextTool label="Subheading" active={s.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </TextTool>
            <Divider />
            <Tool label="Bulleted list" active={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <path d="M8 6h8M8 10h8M8 14h8" />
              <circle cx="4.5" cy="6" r="0.9" fill="currentColor" />
              <circle cx="4.5" cy="10" r="0.9" fill="currentColor" />
              <circle cx="4.5" cy="14" r="0.9" fill="currentColor" />
            </Tool>
            <Tool label="Numbered list" active={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <path d="M8.5 6H16M8.5 10H16M8.5 14H16M4 4.5h1v3M3.6 13h1.8l-1.8 2.5h1.9" />
            </Tool>
            <Tool label="Quote" active={s.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <path d="M5 6v8M8.5 7.5H16M8.5 10H16M8.5 12.5h5" />
            </Tool>
          </>
        ) : null}
        <Divider />
        <Tool label={s.link ? 'Edit link' : 'Add link'} active={s.link || linking} onClick={() => setLinking((v) => !v)}>
          <path d="M8.5 11.5a3 3 0 0 0 4.24 0l2.12-2.12a3 3 0 0 0-4.24-4.24l-.7.7M11.5 8.5a3 3 0 0 0-4.24 0L5.14 10.62a3 3 0 0 0 4.24 4.24l.7-.7" />
        </Tool>
        {kind === 'full' ? (
          <>
            <Divider />
            <Tool label="Undo" disabled={!s.canUndo} onClick={() => editor.chain().focus().undo().run()}>
              <path d="M7 8.5H12.5a3.5 3.5 0 0 1 0 7H9M7 8.5l2.5-2.5M7 8.5l2.5 2.5" />
            </Tool>
            <Tool label="Redo" disabled={!s.canRedo} onClick={() => editor.chain().focus().redo().run()}>
              <path d="M13 8.5H7.5a3.5 3.5 0 0 0 0 7H11M13 8.5 10.5 6M13 8.5 10.5 11" />
            </Tool>
          </>
        ) : null}
      </div>
      {linking ? <LinkField editor={editor} onClose={() => setLinking(false)} /> : null}
    </div>
  );
}

function LinkField({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState((editor.getAttributes('link').href as string | undefined) ?? '');
  useEffect(() => ref.current?.focus(), []);

  function apply() {
    const value = url.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!value) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|mailto:)/i.test(value) ? value : `https://${value}` }).run();
    onClose();
  }

  return (
    <div className="absolute top-full right-0 z-20 mt-2 flex w-72 max-w-[80vw] items-center gap-2 rounded-md3-md bg-md-surface-container p-2 shadow-lg ring-1 ring-md-outline/15">
      <input
        ref={ref}
        type="url"
        value={url}
        placeholder="https://"
        aria-label="Link address"
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          // Enter would otherwise submit the whole form around the editor.
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
          if (e.key === 'Escape') onClose();
        }}
        className="min-w-0 flex-1 rounded-md3-xs bg-md-surface-container-low px-3 py-2 text-label-md outline-none focus:ring-2 focus:ring-md-primary/40"
      />
      <button
        type="button"
        onClick={apply}
        className="rounded-full bg-md-primary px-3 py-1.5 text-label-md font-medium text-md-on-primary transition-all duration-200 hover:bg-md-primary/90 active:scale-95"
      >
        {url.trim() ? 'Apply' : 'Remove'}
      </button>
    </div>
  );
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      // Keep the editor's selection when a toolbar button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-full transition-all duration-200 ease-md3 active:scale-90 disabled:opacity-30',
        active ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant hover:bg-md-primary/10',
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

function TextTool({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active ?? undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-label-sm font-bold transition-all duration-200 ease-md3 active:scale-90',
        active ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant hover:bg-md-primary/10',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-md-outline/25" />;
}
