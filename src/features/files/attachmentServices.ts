import { supabase } from "../../shared/lib/supabase";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function uploadAttachment(file: File) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const path = `${userData.user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: storageError } = await supabase.storage.from("attachments").upload(path, file);
  if (storageError) throw storageError;

  const { error } = await supabase.from("attachments").insert({
    file_name: file.name,
    storage_path: path,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: userData.user.id
  });
  if (error) throw error;

  const signedUrl = await createAttachmentSignedUrl(path);
  return { path, signedUrl };
}

export async function createAttachmentSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function resolvePrivateImageUrls(html: string) {
  if (!html || !html.includes("data-storage-path")) return html;

  const document = new DOMParser().parseFromString(html, "text/html");
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-storage-path]"));
  await Promise.all(images.map(async (image) => {
    const path = image.dataset.storagePath;
    if (!path) return;
    image.src = await createAttachmentSignedUrl(path);
  }));

  return document.body.innerHTML;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}
