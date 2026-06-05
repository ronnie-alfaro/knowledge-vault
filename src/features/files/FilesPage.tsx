import { Upload } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "../../shared/components/EmptyState";
import { supabase } from "../../shared/lib/supabase";
import { formatBytes } from "../../shared/lib/utils";
import { uploadAttachment } from "./attachmentServices";

export function FilesPage() {
  const queryClient = useQueryClient();
  const files = useQuery({
    queryKey: ["attachments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attachments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });
  const upload = useMutation({
    mutationFn: uploadAttachment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attachments"] })
  });

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Files</h1><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Images, PDFs, and documents stored in Supabase Storage.</p></div>
        <label><input className="sr-only" type="file" accept="image/*,application/pdf,.doc,.docx,.txt,.md" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} /><span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded border border-vault-accent bg-vault-accent px-4 text-sm font-medium text-white"><Upload size={16} /> Upload</span></label>
      </div>
      <div className="mt-6 rounded border border-vault-line bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {files.data?.length === 0 ? <EmptyState title="No uploads yet" description="Upload a file to store it securely in your vault." /> : null}
        {files.data?.map((file) => (
          <div key={file.id} className="grid gap-2 border-b border-vault-line p-4 text-sm last:border-b-0 dark:border-zinc-800 sm:grid-cols-[1fr_120px_180px]">
            <span className="font-medium">{file.file_name}</span><span>{formatBytes(file.file_size)}</span><span className="text-zinc-500">{new Date(file.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
