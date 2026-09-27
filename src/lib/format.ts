export const DEFAULT_CURRENCY = "BDT";

const currencyFmtCache = new Map<string, Intl.NumberFormat>();

function currencyFmt(code: string) {
  let fmt = currencyFmtCache.get(code);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      });
    } catch {
      // Unknown/invalid ISO code — fall back to plain decimal + code prefix.
      const decimal = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      fmt = {
        format: (n: number) => `${code} ${decimal.format(n)}`,
      } as Intl.NumberFormat;
    }
    currencyFmtCache.set(code, fmt);
  }
  return fmt;
}

const pdfAmountFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * "BDT 12,000.00" — for PDFs. The built-in PDF fonts have no glyph for
 * symbols like ৳, so PDFs show the ISO code instead of the symbol.
 */
export function formatCurrencyCode(
  value: number | string | { toString(): string },
  code: string = DEFAULT_CURRENCY,
) {
  const n = typeof value === "number" ? value : Number(value.toString());
  return `${code} ${pdfAmountFmt.format(Number.isFinite(n) ? n : 0)}`;
}

export function formatCurrency(
  value: number | string | { toString(): string },
  code: string = DEFAULT_CURRENCY,
) {
  const n = typeof value === "number" ? value : Number(value.toString());
  return currencyFmt(code).format(Number.isFinite(n) ? n : 0);
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return dateTimeFmt.format(d);
}

/** yyyy-mm-dd for date inputs */
export function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
