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

export async function sendOrderConfirmationEmail(params: OrderConfirmationParams): Promise<void> {
  const missing = [
    !SERVICE_ID && 'VITE_EMAILJS_SERVICE_ID',
    !TEMPLATE_ID && 'VITE_EMAILJS_TEMPLATE_ID',
    !PUBLIC_KEY && 'VITE_EMAILJS_PUBLIC_KEY',
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new Error('EmailJS is not configured: missing ' + missing.join(', '));
  }

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: params.to_email,
        to_name: params.to_name,
        order_id: params.order_id,
        order_total: String(params.order_total),
        order_items_summary: params.order_items_summary,
        tracking_url: params.tracking_url,
      },
      { publicKey: PUBLIC_KEY },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error('EmailJS failed to send the order confirmation: ' + detail);
  }
}