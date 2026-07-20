import { randomBytes, randomInt } from "node:crypto";

function randomDigits(len: number) {
  let out = "";
  for (let i = 0; i < len; i++) out += randomInt(0, 10).toString();
  return out;
}

function randomAlphaNum(len: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

/** BURAQ-STU-XXXXXX */
export function generateStudentId() {
  return `BURAQ-STU-${randomDigits(6)}`;
}

/** BURAQ-YYYY-XXXXXX */
export function generateCertificateId(year = new Date().getFullYear()) {
  return `BURAQ-${year}-${randomAlphaNum(6)}`;
}

/** INV-YYYY-XXXXXX */
export function generateInvoiceNumber(year = new Date().getFullYear()) {
  return `INV-${year}-${randomDigits(6)}`;
}

/** TKT-XXXXXX */
export function generateTicketId() {
  return `TKT-${randomAlphaNum(6)}`;
}
