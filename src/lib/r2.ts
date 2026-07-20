import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

export function isR2Configured() {
  return Boolean(
    accountId && accessKeyId && secretAccessKey && bucket && publicUrl,
  );
}

let client: S3Client | null = null;
function getClient() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
    });
  }
  return client;
}

function extFromName(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}

/**
 * Uploads a file to R2 and returns its public URL.
 * `prefix` groups objects, e.g. "students", "certificates", "invoices".
 */
export async function uploadToR2(
  file: { arrayBuffer(): Promise<ArrayBuffer>; type?: string; name?: string },
  prefix: string,
  opts?: { filename?: string; contentType?: string },
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error(
      "R2 storage is not configured. Set R2_* environment variables.",
    );
  }
  const ext = opts?.filename
    ? extFromName(opts.filename)
    : file.name
      ? extFromName(file.name)
      : "";
  const key = `${prefix}/${randomUUID()}${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: opts?.contentType ?? file.type ?? "application/octet-stream",
    }),
  );

  return `${publicUrl}/${key}`;
}

/** Upload a raw Buffer (e.g. a generated PDF) to R2. */
export async function uploadBufferToR2(
  buffer: Buffer,
  prefix: string,
  filename: string,
  contentType: string,
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error(
      "R2 storage is not configured. Set R2_* environment variables.",
    );
  }
  const key = `${prefix}/${randomUUID()}-${filename}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `${publicUrl}/${key}`;
}
