import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

interface OrderConfirmationParams {
  to_email: string;
  to_name: string;
  order_id: string;
  order_total: number;
  order_items_summary: string;
  tracking_url: string;
}

/**
 * Sends an order confirmation email straight from the browser via EmailJS
 * — no backend function, no domain verification, genuinely free tier.
 * Fire-and-forget by design (called from Checkout.tsx without awaiting
 * failure): a missed confirmation email should never block or fail the
 * order itself.
 */
export async function sendOrderConfirmationEmail(params: OrderConfirmationParams): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    // Not configured yet — silently skip rather than throw, so checkout
    // keeps working before EmailJS setup is done. See EMAILJS_SETUP.md.
    return;
  }
  await emailjs.send(SERVICE_ID, TEMPLATE_ID, { ...params }, { publicKey: PUBLIC_KEY });
}