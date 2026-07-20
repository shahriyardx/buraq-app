export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  // field -> error message
  errors?: Record<string, string>;
};

export const initialActionState: ActionState = { status: "idle" };

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v.length ? v : null;
}

export function optDate(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function num(fd: FormData, key: string, fallback = 0): number {
  const v = Number(str(fd, key));
  return Number.isFinite(v) ? v : fallback;
}

export function file(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  if (
    v &&
    typeof v === "object" &&
    "arrayBuffer" in v &&
    (v as File).size > 0
  ) {
    return v as File;
  }
  return null;
}
