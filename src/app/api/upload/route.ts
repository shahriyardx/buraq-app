import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

const ALLOWED_PREFIXES = new Set([
  "students",
  "instructors",
  "school",
  "certificates",
  "tickets",
  "profile",
]);

/**
 * Authenticated file-upload endpoint. tRPC is JSON-only, so binary uploads go
 * here first and the returned URL is passed into the relevant tRPC mutation.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "File storage is not configured." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const prefix = String(form.get("prefix") ?? "");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_PREFIXES.has(prefix)) {
    return NextResponse.json({ error: "Invalid prefix" }, { status: 400 });
  }

  // Students can only upload their own profile photo.
  if (session.user.role !== "ADMIN" && prefix !== "profile") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = await uploadToR2(file as File, prefix);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
