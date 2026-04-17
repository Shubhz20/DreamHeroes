/**
 * Email notifications.
 *
 * For the selection-process demo, this is a stub that logs to the server
 * console. In production the same interface can back onto Resend, Postmark,
 * or SES by swapping the body of `sendEmail`. All call sites (subscription
 * confirmations, draw results, winner notifications) use this single
 * function so the integration point is one line of code.
 */
export type EmailArgs = {
  to: string;
  subject: string;
  body: string;
};

export async function sendEmail({ to, subject, body }: EmailArgs) {
  // In production: swap for Resend / Postmark / SES client.
  console.log(`[email] → ${to}`);
  console.log(`[email]   subject: ${subject}`);
  console.log(`[email]   body: ${body.replace(/\n/g, "\n           ")}`);
}
