import "server-only";
import { cache } from "react";
import { DEFAULT_CURRENCY } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * School-wide currency (ISO 4217). Memoized per request. Falls back to the
 * default when settings are missing.
 */
export const getCurrency = cache(async () => {
  const settings = await prisma.schoolSettings.findUnique({
    where: { id: "singleton" },
    select: { currency: true },
  });
  return settings?.currency ?? DEFAULT_CURRENCY;
});
