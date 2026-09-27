import type { EmailAudience, EmailTemplateDef } from "./templates";

export type Vars = Record<string, string | number | null | undefined>;

export type SchoolInfo = {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  appUrl: string;
};

/** Content id of the inline logo attachment (see notify.ts). */
export const LOGO_CID = "school-logo";

const c = {
  olive: "#5c6a3b",
  oliveDark: "#3f4a26",
  brass: "#b08a3e",
  page: "#f3f1e9",
  card: "#ffffff",
  ink: "#23261d",
  muted: "#6d6f63",
  rule: "#e6e3d6",
  soft: "#f8f6ef",
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function value(vars: Vars, key: string) {
  const v = vars[key];
  return v === null || v === undefined ? "" : String(v).trim();
}

/** Fills {{var}} placeholders. Returns null when every placeholder is empty. */
function fill(template: string, vars: Vars): string | null {
  let used = 0;
  let filled = 0;
  const out = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    used++;
    const v = value(vars, key);
    if (v) filled++;
    return v;
  });
  return used > 0 && filled === 0 ? null : out;
}

function paragraphs(body: string, vars: Vars) {
  return body
    .split(/\n\s*\n/)
    .map((p) => fill(p.trim(), vars))
    .filter((p): p is string => Boolean(p?.trim()));
}

function detailRows(def: EmailTemplateDef, vars: Vars) {
  return (def.details ?? [])
    .map(([label, tpl]) => [label, fill(tpl, vars)] as const)
    .filter((r): r is readonly [string, string] => Boolean(r[1]?.trim()));
}

function footerNote(
  audience: EmailAudience,
  alwaysSend: boolean,
  school: string,
) {
  if (audience === "admin") {
    return `You are receiving this alert because you are an administrator at ${school}. You can turn alerts off in your account settings.`;
  }
  return alwaysSend
    ? `You are receiving this email because you have an account with ${school}.`
    : `You are receiving this email because you have an account with ${school}. You can turn off these notifications in your account settings.`;
}

export type RenderedEmail = { subject: string; html: string; text: string };

/**
 * Renders a template into a branded HTML email plus a plain-text version.
 * `subject` and `body` may come from an admin override; everything else comes
 * from the code definition.
 */
export function renderEmail(input: {
  def: EmailTemplateDef;
  subject: string;
  body: string;
  vars: Vars;
  school: SchoolInfo;
}): RenderedEmail {
  const { def, vars, school } = input;
  const subject = (fill(input.subject, vars) ?? def.label)
    .replace(/\s+/g, " ")
    .trim();
  const heading = fill(def.heading, vars) ?? def.label;
  const paras = paragraphs(input.body, vars);
  const rows = detailRows(def, vars);
  const quote = def.quoteVar ? value(vars, def.quoteVar) : "";
  const ctaUrl = def.cta ? value(vars, def.cta.urlVar) : "";
  const note = footerNote(def.audience, def.alwaysSend, school.name);
  const contact = [school.address, school.phone, school.email].filter(
    (x): x is string => Boolean(x?.trim()),
  );
  // Inbox preview line: the first paragraph, trimmed.
  const preheader = (paras[0] ?? heading).slice(0, 140);

  const e = escapeHtml;
  const pHtml = paras
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${c.ink};">${e(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  const quoteHtml = quote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td style="border-left:3px solid ${c.brass};background:${c.soft};padding:14px 16px;font-size:14px;line-height:22px;color:${c.ink};">${e(quote).replace(/\n/g, "<br>")}</td></tr></table>`
    : "";

  const rowsHtml = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;border:1px solid ${c.rule};border-radius:6px;border-collapse:separate;">${rows
        .map(
          ([label, val], i) =>
            `<tr><td style="padding:11px 16px;font-size:13px;color:${c.muted};${i ? `border-top:1px solid ${c.rule};` : ""}">${e(label)}</td><td align="right" style="padding:11px 16px;font-size:14px;font-weight:600;color:${c.ink};${i ? `border-top:1px solid ${c.rule};` : ""}">${e(val)}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const ctaHtml =
    def.cta && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:6px;background:${c.olive};"><a href="${e(ctaUrl)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${e(def.cta.label)}</a></td></tr></table><p style="margin:0 0 8px;font-size:12px;line-height:18px;color:${c.muted};">If the button does not work, copy this link into your browser:<br><a href="${e(ctaUrl)}" style="color:${c.olive};word-break:break-all;">${e(ctaUrl)}</a></p>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${c.page};font-family:${FONT};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td align="center" style="padding:0 0 20px;">
<img src="cid:${LOGO_CID}" width="64" height="64" alt="${e(school.name)}" style="display:block;width:64px;height:64px;border:0;">
<div style="margin-top:10px;font-family:Georgia, 'Times New Roman', serif;font-size:13px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${c.oliveDark};">${e(school.name)}</div>
</td></tr>
<tr><td style="background:${c.card};border-radius:10px;border-top:4px solid ${c.olive};padding:36px 36px 28px;">
<h1 style="margin:0 0 20px;font-family:Georgia, 'Times New Roman', serif;font-size:24px;line-height:32px;font-weight:bold;color:${c.oliveDark};">${e(heading)}</h1>
${pHtml}${quoteHtml}${rowsHtml}${ctaHtml}
<p style="margin:16px 0 0;font-size:15px;line-height:24px;color:${c.ink};">Kind regards,<br><strong>${e(school.name)}</strong></p>
</td></tr>
<tr><td align="center" style="padding:24px 24px 0;font-size:12px;line-height:19px;color:${c.muted};">
${contact.length ? `<div style="margin-bottom:8px;">${contact.map(e).join(" &nbsp;·&nbsp; ")}</div>` : ""}
<div>${e(note)}</div>
<div style="margin-top:8px;"><a href="${e(school.appUrl)}" style="color:${c.olive};text-decoration:none;">${e(school.appUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    heading,
    "",
    ...paras.flatMap((p) => [p, ""]),
    ...(quote ? [...quote.split("\n").map((l) => `> ${l}`), ""] : []),
    ...(rows.length ? [...rows.map(([l, v]) => `${l}: ${v}`), ""] : []),
    ...(def.cta && ctaUrl ? [`${def.cta.label}: ${ctaUrl}`, ""] : []),
    "Kind regards,",
    school.name,
    "",
    "--",
    ...contact,
    note,
    school.appUrl,
  ].join("\n");

  return { subject, html, text };
}
