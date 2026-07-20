/**
 * Uploads a file via the /api/upload route and returns its public URL.
 * Throws with the server message on failure (e.g. storage not configured).
 */
export async function uploadFile(file: File, prefix: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("prefix", prefix);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url;
}
