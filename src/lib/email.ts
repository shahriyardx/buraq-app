import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM ?? "Buraq <noreply@example.com>";

export function isEmailConfigured() {
  return Boolean(apiKey);
}

let resend: Resend | null = null;
function getResend() {
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

/** Replaces {{key}} placeholders in a template string. */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

type Attachment = {
  filename: string;
  content: Buffer;
  /** Set to embed the file inline, referenced in HTML as `cid:<contentId>`. */
  contentId?: string;
};

// Dev/staging safety net: when set, every email goes to this address instead
// of the real recipient. Never set this in production.
const redirectTo = process.env.EMAIL_REDIRECT_TO?.trim() || null;

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | null;
  attachments?: Attachment[];
}): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping email to ${input.to}`,
    );
    return { sent: false, error: "Email is not configured" };
  }
  const to = redirectTo ?? input.to;
  const subject = redirectTo
    ? `[to: ${input.to}] ${input.subject}`
    : input.subject;
  try {
    const { error } = await getResend().emails.send({
      from,
      to,
      subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        ...(a.contentId ? { contentId: a.contentId } : {}),
      })),
    });
    if (error) {
      console.error("[email] send failed", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed", err);
    return { sent: false, error: (err as Error).message };
  }
}
