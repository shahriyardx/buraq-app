-- The old seed wrote one-line email templates. Defaults now live in code, so
-- remove only rows that still hold that untouched seed text (admin edits stay).
DELETE FROM "email_template" WHERE "body" IN (
  E'Hi {{studentName}},\n\nYou have been enrolled in {{courseName}}. We look forward to riding with you!\n\n— Buraq Horse Riding School',
  E'Hi {{studentName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{amount}}, due {{dueDate}}.\n\nThank you.',
  E'Hi {{studentName}},\n\nCongratulations on completing {{courseName}}! Your certificate ({{certificateId}}) is attached.',
  E'Hi {{studentName}},\n\nThere is an update on your support ticket {{ticketId}}.'
);
