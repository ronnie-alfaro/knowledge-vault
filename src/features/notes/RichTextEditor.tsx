import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, LinkIcon, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../../shared/components/Button";

export function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Capture the thought before it fades..." })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "prose prose-zinc max-w-none dark:prose-invert" } }
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, false);
  }, [editor, value]);

  if (!editor) return null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        <Button type="button" size="icon" variant="secondary" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Bulleted list" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Link" onClick={() => { const href = prompt("URL"); if (href) editor.chain().focus().setLink({ href }).run(); }}><LinkIcon size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></Button>
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}
