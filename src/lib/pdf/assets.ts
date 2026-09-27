import { readFile } from "node:fs/promises";
import path from "node:path";

// react-pdf can only embed PNG and JPEG images.
const PDF_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

function toDataUrl(buf: Buffer, type: string) {
  return `data:${type};base64,${buf.toString("base64")}`;
}

/** The bundled school logo (public/logo.png) as a data URL. */
export async function defaultLogoDataUrl(): Promise<string | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "logo.png"));
    return toDataUrl(buf, "image/png");
  } catch {
    return null;
  }
}

/** The school's uploaded logo if usable, else the bundled one. */
export async function schoolLogoDataUrl(
  uploadedUrl?: string | null,
): Promise<string | null> {
  return (await remoteImageDataUrl(uploadedUrl)) ?? defaultLogoDataUrl();
}

/**
 * Fetches an uploaded image (e.g. from R2) as a data URL for a PDF.
 * Returns null when it is missing, unreachable, or not PNG/JPEG, so a bad
 * asset never breaks PDF generation.
 */
export async function remoteImageDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!PDF_IMAGE_TYPES.has(type)) return null;
    return toDataUrl(Buffer.from(await res.arrayBuffer()), type);
  } catch {
    return null;
  }
}
