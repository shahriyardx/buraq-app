/**
 * Email template registry. Each template has a code default (so emails work on
 * a fresh database) that admins may override in Settings → Email Templates.
 * Only `subject` and `body` are editable; heading, button, details and quote
 * are fixed here so every email keeps the same professional structure.
 *
 * Body text: blank lines separate paragraphs; {{var}} placeholders are filled
 * at send time. A paragraph whose variables are all empty is dropped.
 */

export type EmailTemplateKey =
  | "WELCOME"
  | "ACCOUNT_CREATED"
  | "PASSWORD_RESET"
  | "ENROLLMENT"
  | "INVOICE"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_REJECTED"
  | "CERTIFICATE"
  | "TICKET_RECEIVED"
  | "SUPPORT"
  | "ADMIN_NEW_REGISTRATION"
  | "ADMIN_PAYMENT_SUBMITTED"
  | "ADMIN_NEW_TICKET"
  | "ADMIN_TICKET_REPLY";

export type EmailAudience = "member" | "admin";

export type EmailTemplateDef = {
  label: string;
  description: string;
  audience: EmailAudience;
  /**
   * Account, security and billing emails are always sent. Others respect the
   * recipient's "email notifications" setting.
   */
  alwaysSend: boolean;
  subject: string;
  heading: string;
  body: string;
  /** Button: label + the variable that holds its URL. */
  cta?: { label: string; urlVar: string };
  /** Summary rows shown as a table: [label, value template]. */
  details?: [string, string][];
  /** Variable rendered as a quoted message (e.g. a support reply). */
  quoteVar?: string;
  /** Variables available to this template, for the editor. */
  vars: string[];
};

const COMMON_VARS = ["name", "firstName", "schoolName"];

export const EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateDef> = {
  WELCOME: {
    label: "Welcome (self-registration)",
    description: "Sent to a student after they create an account on the site.",
    audience: "member",
    alwaysSend: true,
    subject: "Welcome to {{schoolName}}",
    heading: "Welcome aboard, {{firstName}}",
    body: "Thank you for registering with {{schoolName}}. Your student account is ready to use.\n\nFrom your dashboard you can browse our courses, enroll, book riding sessions and follow your progress.\n\nWe look forward to welcoming you at the stables.",
    cta: { label: "Go to your dashboard", urlVar: "dashboardUrl" },
    details: [
      ["Student ID", "{{studentId}}"],
      ["Email", "{{email}}"],
    ],
    vars: [...COMMON_VARS, "email", "studentId", "dashboardUrl"],
  },

  ACCOUNT_CREATED: {
    label: "Account created by the school",
    description:
      "Sent when an admin creates a student, instructor or admin account.",
    audience: "member",
    alwaysSend: true,
    subject: "Your {{schoolName}} account is ready",
    heading: "Your account is ready",
    body: "Hello {{firstName}},\n\n{{schoolName}} has created a {{roleLabel}} account for you. You can sign in with this email address.\n\nFor your security, please set your own password before you sign in for the first time. Use the button below and follow the instructions.",
    cta: { label: "Set your password", urlVar: "setPasswordUrl" },
    details: [
      ["Account type", "{{roleLabel}}"],
      ["Email", "{{email}}"],
      ["ID", "{{memberId}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "email",
      "roleLabel",
      "memberId",
      "setPasswordUrl",
      "loginUrl",
    ],
  },

  PASSWORD_RESET: {
    label: "Password reset",
    description: "Sent when someone asks to reset their password.",
    audience: "member",
    alwaysSend: true,
    subject: "Reset your {{schoolName}} password",
    heading: "Reset your password",
    body: "Hello {{firstName}},\n\nWe received a request to reset the password for your account. Use the button below to choose a new password. For your security, this link expires in 1 hour.\n\nIf you did not ask to reset your password, you can ignore this email. Your password will not change.",
    cta: { label: "Reset password", urlVar: "resetUrl" },
    vars: [...COMMON_VARS, "resetUrl"],
  },

  ENROLLMENT: {
    label: "Enrollment confirmed",
    description: "Sent when a student's enrollment in a course becomes active.",
    audience: "member",
    alwaysSend: false,
    subject: "You're enrolled in {{courseName}}",
    heading: "Enrollment confirmed",
    body: "Hello {{firstName}},\n\nYour enrollment in {{courseName}} is confirmed and active. You can now book your riding sessions from your dashboard.\n\nPlease arrive a little early for each session and wear suitable riding clothes and boots. Our instructors will guide you through the rest.",
    cta: { label: "Book a session", urlVar: "bookingsUrl" },
    details: [
      ["Course", "{{courseName}}"],
      ["Level", "{{courseLevel}}"],
      ["Programme length", "{{duration}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "courseName",
      "courseLevel",
      "duration",
      "bookingsUrl",
    ],
  },

  INVOICE: {
    label: "Invoice issued",
    description:
      "Sent with the invoice PDF when an invoice is created, and when an admin sends it again.",
    audience: "member",
    alwaysSend: true,
    subject: "Invoice {{invoiceNumber}} from {{schoolName}}",
    heading: "Your invoice",
    body: "Hello {{firstName}},\n\nA new invoice has been issued to your account. The details are below, and the invoice PDF is attached for your records.\n\nYou can pay online from your dashboard or in person at the office. Please complete payment by {{dueDate}}.",
    cta: { label: "View and pay invoice", urlVar: "invoiceUrl" },
    details: [
      ["Invoice", "{{invoiceNumber}}"],
      ["Description", "{{description}}"],
      ["Amount due", "{{amount}}"],
      ["Due date", "{{dueDate}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "invoiceNumber",
      "description",
      "amount",
      "dueDate",
      "invoiceUrl",
    ],
  },

  PAYMENT_RECEIVED: {
    label: "Payment submitted",
    description:
      "Sent to the student after they submit a payment, while it waits for review.",
    audience: "member",
    alwaysSend: true,
    subject: "We received your payment for {{invoiceNumber}}",
    heading: "Payment received",
    body: "Hello {{firstName}},\n\nThank you. We have received your payment submission for invoice {{invoiceNumber}}. Our team will verify it and confirm shortly.\n\nYou will receive another email as soon as your payment is confirmed.",
    cta: { label: "View invoice", urlVar: "invoiceUrl" },
    details: [
      ["Invoice", "{{invoiceNumber}}"],
      ["Amount", "{{amount}}"],
      ["Method", "{{method}}"],
      ["Transaction ID", "{{transactionId}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "invoiceNumber",
      "amount",
      "method",
      "transactionId",
      "invoiceUrl",
    ],
  },

  PAYMENT_CONFIRMED: {
    label: "Payment confirmed (receipt)",
    description:
      "Sent with a PAID invoice PDF when an admin approves or records a payment.",
    audience: "member",
    alwaysSend: true,
    subject: "Payment confirmed: {{invoiceNumber}}",
    heading: "Payment confirmed",
    body: "Hello {{firstName}},\n\nYour payment for invoice {{invoiceNumber}} has been confirmed. Thank you. Your receipt is attached.\n\n{{enrollmentNote}}",
    cta: { label: "Go to your dashboard", urlVar: "dashboardUrl" },
    details: [
      ["Invoice", "{{invoiceNumber}}"],
      ["Amount paid", "{{amount}}"],
      ["Payment date", "{{paidDate}}"],
      ["Method", "{{method}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "invoiceNumber",
      "amount",
      "paidDate",
      "method",
      "enrollmentNote",
      "dashboardUrl",
    ],
  },

  PAYMENT_REJECTED: {
    label: "Payment not confirmed",
    description: "Sent when an admin rejects a submitted payment.",
    audience: "member",
    alwaysSend: true,
    subject: "Action needed: payment for {{invoiceNumber}}",
    heading: "We could not confirm your payment",
    body: "Hello {{firstName}},\n\nWe were unable to confirm your payment for invoice {{invoiceNumber}}.\n\nReason: {{reason}}\n\nPlease check the details and submit your payment again. If you need help, reply to this email or contact the office.",
    cta: { label: "Pay invoice", urlVar: "invoiceUrl" },
    details: [
      ["Invoice", "{{invoiceNumber}}"],
      ["Amount due", "{{amount}}"],
    ],
    vars: [...COMMON_VARS, "invoiceNumber", "amount", "reason", "invoiceUrl"],
  },

  CERTIFICATE: {
    label: "Certificate issued",
    description: "Sent with the certificate PDF when a certificate is issued.",
    audience: "member",
    alwaysSend: false,
    subject: "Congratulations! Your {{courseName}} certificate",
    heading: "Congratulations, {{firstName}}!",
    body: "You have successfully completed {{courseName}} at {{schoolName}}. Your certificate is attached to this email as a PDF.\n\nEvery certificate carries a unique ID and QR code, so anyone can confirm it is genuine on our verification page.\n\nWell done, and thank you for riding with us.",
    cta: { label: "Verify certificate", urlVar: "verifyUrl" },
    details: [
      ["Certificate ID", "{{certificateId}}"],
      ["Course", "{{courseName}}"],
      ["Issued on", "{{issuedDate}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "courseName",
      "certificateId",
      "issuedDate",
      "verifyUrl",
    ],
  },

  TICKET_RECEIVED: {
    label: "Support request received",
    description: "Sent to the student when they open a support request.",
    audience: "member",
    alwaysSend: false,
    subject: "We received your request [{{ticketId}}]",
    heading: "We received your request",
    body: "Hello {{firstName}},\n\nThank you for contacting {{schoolName}}. Your support request has been received, and our team will get back to you as soon as possible.\n\nYou can follow the conversation and add more details at any time.",
    cta: { label: "View request", urlVar: "ticketUrl" },
    details: [
      ["Reference", "{{ticketId}}"],
      ["Subject", "{{subject}}"],
      ["Category", "{{category}}"],
    ],
    vars: [...COMMON_VARS, "ticketId", "subject", "category", "ticketUrl"],
  },

  SUPPORT: {
    label: "Support reply",
    description:
      "Sent to the student when the school replies to their request.",
    audience: "member",
    alwaysSend: false,
    subject: "Re: {{subject}} [{{ticketId}}]",
    heading: "New reply to your request",
    body: "Hello {{firstName}},\n\nOur team has replied to your support request {{ticketId}}.",
    cta: { label: "View conversation", urlVar: "ticketUrl" },
    quoteVar: "message",
    vars: [...COMMON_VARS, "ticketId", "subject", "message", "ticketUrl"],
  },

  ADMIN_NEW_REGISTRATION: {
    label: "Admin alert: new registration",
    description: "Sent to admins when a student registers on the site.",
    audience: "admin",
    alwaysSend: false,
    subject: "New student registration: {{studentName}}",
    heading: "New student registration",
    body: "A new student has registered on the website.",
    cta: { label: "View student", urlVar: "studentUrl" },
    details: [
      ["Name", "{{studentName}}"],
      ["Email", "{{studentEmail}}"],
      ["Phone", "{{studentPhone}}"],
      ["Student ID", "{{studentId}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "studentName",
      "studentEmail",
      "studentPhone",
      "studentId",
      "studentUrl",
    ],
  },

  ADMIN_PAYMENT_SUBMITTED: {
    label: "Admin alert: payment to review",
    description: "Sent to admins when a student submits a payment.",
    audience: "admin",
    alwaysSend: false,
    subject: "Payment to review: {{invoiceNumber}} ({{studentName}})",
    heading: "A payment is waiting for review",
    body: "{{studentName}} has submitted a payment. Please verify it, then approve or reject it.",
    cta: { label: "Review payment", urlVar: "reviewUrl" },
    details: [
      ["Invoice", "{{invoiceNumber}}"],
      ["Student", "{{studentName}}"],
      ["Amount", "{{amount}}"],
      ["Method", "{{method}}"],
      ["Transaction ID", "{{transactionId}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "invoiceNumber",
      "studentName",
      "amount",
      "method",
      "transactionId",
      "reviewUrl",
    ],
  },

  ADMIN_NEW_TICKET: {
    label: "Admin alert: new support request",
    description: "Sent to admins when a student opens a support request.",
    audience: "admin",
    alwaysSend: false,
    subject: "New support request [{{ticketId}}]: {{subject}}",
    heading: "New support request",
    body: "{{studentName}} opened a new support request.",
    cta: { label: "Open request", urlVar: "ticketUrl" },
    quoteVar: "message",
    details: [
      ["Reference", "{{ticketId}}"],
      ["Subject", "{{subject}}"],
      ["Category", "{{category}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "studentName",
      "ticketId",
      "subject",
      "category",
      "message",
      "ticketUrl",
    ],
  },

  ADMIN_TICKET_REPLY: {
    label: "Admin alert: student replied",
    description:
      "Sent when a student replies to a support request. Goes to the assigned admin, or to all admins if none is assigned.",
    audience: "admin",
    alwaysSend: false,
    subject: "New reply on [{{ticketId}}]: {{subject}}",
    heading: "A student replied",
    body: "{{studentName}} replied to support request {{ticketId}}.\n\n{{reopenedNote}}",
    cta: { label: "Open request", urlVar: "ticketUrl" },
    quoteVar: "message",
    details: [
      ["Reference", "{{ticketId}}"],
      ["Subject", "{{subject}}"],
      ["Status", "{{status}}"],
    ],
    vars: [
      ...COMMON_VARS,
      "studentName",
      "ticketId",
      "subject",
      "status",
      "reopenedNote",
      "message",
      "ticketUrl",
    ],
  },
};

export const EMAIL_TEMPLATE_KEYS = Object.keys(
  EMAIL_TEMPLATES,
) as EmailTemplateKey[];
