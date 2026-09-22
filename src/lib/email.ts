import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

export interface OrderConfirmationParams {
  to_email: string;
  to_name: string;
  order_id: string;
  order_total: number;
  order_items_summary: string;
  tracking_url: string;
}

export interface EmailSendResult {
  status: number;
  text: string;
}

function isTransientEmailError(error: unknown): boolean {
  const candidate = error as { status?: number; text?: string; message?: string } | null;
  const status = candidate?.status;
  const message = String(candidate?.text || candidate?.message || error || '').toLowerCase();

  return (
    status === 429 ||
    (typeof status === 'number' && status >= 500) ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('temporarily') ||
    message.includes('unavailable')
  );
}

export async function sendOrderConfirmationEmail(
  params: OrderConfirmationParams,
): Promise<EmailSendResult> {
  const missing = [
    !SERVICE_ID && 'VITE_EMAILJS_SERVICE_ID',
    !TEMPLATE_ID && 'VITE_EMAILJS_TEMPLATE_ID',
    !PUBLIC_KEY && 'VITE_EMAILJS_PUBLIC_KEY',
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new Error('EmailJS is not configured: missing ' + missing.join(', '));
  }

  const serviceId = SERVICE_ID as string;
  const templateId = TEMPLATE_ID as string;
  const publicKey = PUBLIC_KEY as string;

  const templateParams = {
    to_email: params.to_email.trim(),
    to_name: params.to_name.trim(),
    order_id: params.order_id,
    order_total: String(params.order_total),
    order_items_summary: params.order_items_summary,
    tracking_url: params.tracking_url,
  };

  // EmailJS documents a 1 request/second rate limit. We only retry a
  // temporary failure, never a successful request, so a successful send
  // cannot be duplicated by this fallback.
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await emailjs.send(
        serviceId,
        templateId,
        templateParams,
        { publicKey },
      );

      if (response.status !== 200) {
        throw new Error(
          'EmailJS returned status ' + response.status + ': ' + response.text,
        );
      }

      return {
        status: response.status,
        text: response.text,
      };
    } catch (error) {
      lastError = error;

      if (attempt === 0 && isTransientEmailError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        continue;
      }

      const detail = error instanceof Error ? error.message : String(error);
      throw new Error('EmailJS failed to send the order confirmation: ' + detail);
    }
  }

  throw new Error(
    'EmailJS failed to send the order confirmation: ' +
      (lastError instanceof Error ? lastError.message : String(lastError)),
  );
}