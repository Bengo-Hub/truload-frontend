"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Heading2, Heading3, Quote, Undo, Redo,
} from 'lucide-react';
import { Button } from './button';
import { Separator } from './separator';
import { useEffect } from 'react';

// ─── Toolbar Button ──────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 w-7 rounded flex items-center justify-center text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'disabled:opacity-40 disabled:pointer-events-none',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
    </button>
  );
}

// ─── RichTextEditor ──────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = 200,
  readOnly = false,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none px-3 py-2',
          'prose-headings:font-semibold prose-p:leading-relaxed',
        ),
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    if (value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn('border rounded-md overflow-hidden bg-background', className)}>
      {!readOnly && (
        <>
          <div className="flex items-center gap-0.5 p-1.5 border-b bg-muted/30 flex-wrap">
            {/* History */}
            <ToolbarButton
              title="Undo" onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Redo" onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-0.5" />

            {/* Headings */}
            <ToolbarButton
              title="Heading 2"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Heading 3"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-0.5" />

            {/* Marks */}
            <ToolbarButton
              title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-0.5" />

            {/* Lists */}
            <ToolbarButton
              title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
            >
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border mx-0.5" />

            {/* Alignment */}
            <ToolbarButton
              title="Align left"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              active={editor.isActive({ textAlign: 'left' })}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Align center"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              active={editor.isActive({ textAlign: 'center' })}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Align right"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              active={editor.isActive({ textAlign: 'right' })}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
        </>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── RichTextDisplay (read-only HTML render) ─────────────────────────────────

interface RichTextDisplayProps {
  html?: string;
  className?: string;
  emptyText?: string;
}

export function RichTextDisplay({ html, className, emptyText = 'No content.' }: RichTextDisplayProps) {
  if (!html || html === '<p></p>') {
    return <p className="text-sm text-muted-foreground italic">{emptyText}</p>;
  }
  return (
    <div
      className={cn('prose prose-sm max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
