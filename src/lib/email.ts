import { Resend } from "resend";

const DEFAULT_FROM = "HP Elite <noreply@info.gauravganju.com>";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  data: { id: string } | null;
  error: { message: string; name: string } | null;
}

/**
 * Thin wrapper around Resend's emails.send that keeps the SDK's { data, error }
 * shape. Returns an error object (rather than throwing) when the API key is
 * missing or a network-level failure occurs, so callers can respond gracefully.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!resend) {
    return {
      data: null,
      error: {
        name: "configuration_error",
        message: "Email is not configured. Set RESEND_API_KEY.",
      },
    };
  }

  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  try {
    const { data, error } = await resend.emails.send(
      {
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );

    if (error) {
      return { data: null, error: { name: error.name, message: error.message } };
    }
    return { data: data ? { id: data.id } : null, error: null };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    return { data: null, error: { name: "network_error", message } };
  }
}
