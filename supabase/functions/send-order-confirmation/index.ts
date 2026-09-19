// supabase/functions/send-order-confirmation/index.ts
//
// Called from Checkout.tsx right after an order is successfully inserted
// (fire-and-forget — a failure here never blocks the order itself, it's
// just missed confirmation email, not a missed order).
//
// Deploy: supabase functions deploy send-order-confirmation
// Requires: supabase secrets set RESEND_API_KEY=... STORE_NAME="Eldukkan" FROM_EMAIL="orders@yourdomain.com"
// See EMAIL_SETUP.md for how to get these.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, customer_email, address, total, items, payment_method, created_at')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders });
    }

    // No email on file (guest checkout without an account) — nothing to
    // send to, and that's fine, not an error.
    if (!order.customer_email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no customer_email on this order' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const STORE_NAME = Deno.env.get('STORE_NAME') || 'Eldukkan';
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email provider not configured (RESEND_API_KEY missing)' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const items: OrderItem[] = order.items || [];
    const itemRows = items
      .map((item) => `<tr><td style="padding:8px 0;">${item.name} × ${item.quantity}</td><td style="padding:8px 0;text-align:right;">EGP ${item.price * item.quantity}</td></tr>`)
      .join('');

    const trackingUrl = `${Deno.env.get('SITE_URL') || ''}/tracking/${order.id}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
        <h2 style="color: #c96a2e;">${STORE_NAME}</h2>
        <p>Hi ${order.customer_name}, thanks for your order! Here's your confirmation.</p>
        <p style="font-size: 12px; color: #78716c;">Order #${order.id.slice(0, 8).toUpperCase()} · ${new Date(order.created_at).toLocaleDateString()}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          ${itemRows}
          <tr><td style="padding-top:12px; font-weight:bold;">Total</td><td style="padding-top:12px; text-align:right; font-weight:bold;">EGP ${order.total}</td></tr>
        </table>
        <p style="font-size: 13px;">Delivering to: ${order.address}</p>
        <p style="font-size: 13px;">Payment method: ${order.payment_method}</p>
        ${trackingUrl.startsWith('http') ? `<p><a href="${trackingUrl}" style="background:#c96a2e;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Track your order</a></p>` : ''}
      </div>
    `;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${STORE_NAME} <${FROM_EMAIL}>`,
        to: [order.customer_email],
        subject: `Your ${STORE_NAME} order is confirmed`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const details = await emailRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: 'Email send failed', details }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ sent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});