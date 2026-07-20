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

type Attachment = { filename: string; content: Buffer };

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  attachments?: Attachment[];
}): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping email to ${input.to}`,
    );
    return { sent: false, error: "Email is not configured" };
  }
  try {
    await getResend().emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed", err);
    return { sent: false, error: (err as Error).message };
  }
}
