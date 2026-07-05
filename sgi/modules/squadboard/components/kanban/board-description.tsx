"use client";

import { useEffect, useTransition, useCallback } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { cn } from "@/ui/lib/cn";
import { NoteIcon, BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon } from "@/ui/icons";
import { salvarDescricao } from "@/modules/squadboard/actions/board-content";
import type { EntityType } from "@/modules/squadboard/types/board-content";

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded text-xs transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-text-3 hover:bg-surface-3 hover:text-text-2",
      )}
    >
      {children}
    </button>
  );
}

export function BoardDescription({
  entityType,
  entityId,
  valor,
  onChange,
  focusRef,
}: {
  entityType: EntityType;
  entityId: string;
  valor: string;
  onChange: (v: string) => void;
  focusRef?: React.RefObject<{ focus: () => void } | null>;
}) {
  const [, startTransition] = useTransition();

  const salvar = useCallback(
    (html: string) => {
      if (html === valor) return;
      onChange(html);
      startTransition(() => salvarDescricao(entityType, entityId, html));
    },
    [valor, onChange, entityType, entityId],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false }),
      Underline,
    ],
    content: valor || "",
    editorProps: {
      attributes: {
        class: "prose-sm focus:outline-none min-h-[60px] text-sm text-text-2 leading-relaxed",
      },
    },
    onBlur: ({ editor }) => {
      const html = editor.getHTML();
      const empty = editor.isEmpty;
      salvar(empty ? "" : html);
    },
  });

  // Derivar estados ativos da seleção atual — força re-render ao mover cursor
  const fmt = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor?.isActive("bold") ?? false,
      italic: ctx.editor?.isActive("italic") ?? false,
      underline: ctx.editor?.isActive("underline") ?? false,
      strike: ctx.editor?.isActive("strike") ?? false,
      bullet: ctx.editor?.isActive("bulletList") ?? false,
      ordered: ctx.editor?.isActive("orderedList") ?? false,
    }),
  });

  // Sync external value changes (e.g. first load)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (valor !== current) {
      editor.commands.setContent(valor || "");
    }
  }, [valor, editor]);

  // Expose focus via focusRef (ContentBar button)
  useEffect(() => {
    if (!focusRef || !editor) return;
    (focusRef as React.MutableRefObject<{ focus: () => void } | null>).current = {
      focus: () => editor.commands.focus("end"),
    };
  }, [focusRef, editor]);

  if (!editor) return null;

  const isEmpty = editor.isEmpty;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <NoteIcon size={14} className="text-text-3" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-3">Descrição</p>
      </div>

      <div className="rounded-lg border border-border bg-surface-2 focus-within:border-primary transition-colors">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
          <ToolbarBtn
            active={fmt?.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Negrito (Ctrl+B)"
          >
            <BoldIcon size={12} />
          </ToolbarBtn>
          <ToolbarBtn
            active={fmt?.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Itálico (Ctrl+I)"
          >
            <ItalicIcon size={12} />
          </ToolbarBtn>
          <ToolbarBtn
            active={fmt?.underline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Sublinhado (Ctrl+U)"
          >
            <UnderlineIcon size={12} />
          </ToolbarBtn>
          <ToolbarBtn
            active={fmt?.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Tachado"
          >
            <StrikethroughIcon size={12} />
          </ToolbarBtn>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarBtn
            active={fmt?.bullet}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Lista"
          >
            <span className="font-bold">·≡</span>
          </ToolbarBtn>
          <ToolbarBtn
            active={fmt?.ordered}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Lista numerada"
          >
            <span className="font-bold">1≡</span>
          </ToolbarBtn>
        </div>

        {/* Editor area */}
        <div className="relative px-3 py-2.5">
          {isEmpty && (
            <p className="pointer-events-none absolute left-3 top-2.5 text-sm text-text-3 select-none">
              Adicione uma descrição mais detalhada…
            </p>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </section>
  );
}
