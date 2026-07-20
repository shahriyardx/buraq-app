import Papa from "papaparse";

export function toCsv(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows);
}

export function parseCsv<T = Record<string, string>>(text: string): T[] {
  const result = Papa.parse<T>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data;
}

/** Triggers a client-side CSV download. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
