import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useQueryClient } from "@tanstack/react-query";
import { Bold, Image, Italic, LinkIcon, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../shared/components/Button";
import { uploadAttachment } from "../files/attachmentServices";
import { TiptapImage } from "./tiptapImage";

export function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const editor = useEditor({
    extensions: [StarterKit, TiptapImage, Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Capture the thought before it fades..." })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "prose prose-zinc max-w-none dark:prose-invert" } }
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, false);
  }, [editor, value]);

  if (!editor) return null;

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    setIsUploadingImage(true);
    setUploadError("");
    try {
      const image = await uploadAttachment(file);
      editor?.chain().focus().insertContent({
        type: "image",
        attrs: {
          src: image.signedUrl,
          alt: file.name,
          title: file.name,
          storagePath: image.path
        }
      }).run();
      await queryClient.invalidateQueries({ queryKey: ["attachments"] });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        <Button type="button" size="icon" variant="secondary" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Bulleted list" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Link" onClick={() => { const href = prompt("URL"); if (href) editor.chain().focus().setLink({ href }).run(); }}><LinkIcon size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Image" disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}><Image size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></Button>
        <Button type="button" size="icon" variant="secondary" title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></Button>
      </div>
      <input ref={fileInputRef} className="sr-only" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void uploadImage(event.target.files[0])} />
      {isUploadingImage ? <p className="mb-2 text-sm text-zinc-500">Uploading image...</p> : null}
      {uploadError ? <p className="mb-2 text-sm text-red-600">{uploadError}</p> : null}
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}
