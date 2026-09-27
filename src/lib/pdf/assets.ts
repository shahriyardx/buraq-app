import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const UPLOAD_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIDE = 2000;

/**
 * Re-encodes any image as a plain 8-bit RGBA PNG data URL. react-pdf only
 * embeds PNG/JPEG and draws palette (indexed) PNGs badly — e.g. a signature
 * turns into a dotted outline — so every image is normalised first.
 */
async function toPdfDataUrl(input: Buffer): Promise<string> {
  const png = await sharp(input)
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png({ palette: false })
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** The bundled school logo (public/brand/buraq-logo.png) as a data URL. */
export async function defaultLogoDataUrl(): Promise<string | null> {
  try {
    const buf = await readFile(
      path.join(process.cwd(), "public", "brand", "buraq-logo.png"),
    );
    return await toPdfDataUrl(buf);
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
 * Returns null when it is missing, unreachable, or not an image, so a bad
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
    if (!UPLOAD_IMAGE_TYPES.has(type)) return null;
    return await toPdfDataUrl(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}
