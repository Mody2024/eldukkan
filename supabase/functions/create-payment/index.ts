// supabase/functions/create-payment/index.ts
//
// Called from Checkout.tsx after an order is inserted with payment_method
// != 'cod'. Creates a Paymob "Intention" (their unified checkout session
// covering card, Vodafone Cash, InstaPay, and Fawry in one hosted page) and
// returns a redirect URL. Runs server-side so PAYMOB_SECRET_KEY never
// reaches the browser.
//
// Deploy: supabase functions deploy create-payment
// Requires these secrets set first (see PAYMENTS_SETUP.md):
//   supabase secrets set PAYMOB_SECRET_KEY=... PAYMOB_PUBLIC_KEY=...
//   supabase secrets set PAYMOB_INTEGRATION_IDS=111,222,333
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...  (already present by default in most projects)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Server-side re-fetch of the order — never trust an amount passed from
    // the client for a payment request.
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, total, customer_name, customer_email, customer_phone, address, items')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders });
    }

    const PAYMOB_SECRET_KEY = Deno.env.get('PAYMOB_SECRET_KEY');
    const PAYMOB_PUBLIC_KEY = Deno.env.get('PAYMOB_PUBLIC_KEY');
    const PAYMOB_INTEGRATION_IDS = (Deno.env.get('PAYMOB_INTEGRATION_IDS') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);

    if (!PAYMOB_SECRET_KEY || !PAYMOB_PUBLIC_KEY || PAYMOB_INTEGRATION_IDS.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Payment provider not configured. Set PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_INTEGRATION_IDS as Supabase secrets.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Paymob's Intention API (their current unified-checkout entry point).
    // NOTE: verify this endpoint/shape against Paymob's live docs during
    // setup — third-party APIs change, and this was written from
    // documentation that may have moved since.
    const intentionRes = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${PAYMOB_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: Math.round(order.total * 100), // Paymob uses cents/piastres
        currency: 'EGP',
        payment_methods: PAYMOB_INTEGRATION_IDS,
        items: (order.items || []).map((item: { name: string; quantity: number; price: number }) => ({
          name: item.name,
          amount: Math.round(item.price * 100),
          quantity: item.quantity,
        })),
        billing_data: {
          apartment: 'NA',
          floor: 'NA',
          street: order.address || 'NA',
          building: 'NA',
          phone_number: order.customer_phone || 'NA',
          city: 'NA',
          country: 'EG',
          email: order.customer_email || 'guest@eldukkan.com',
          first_name: (order.customer_name || 'Guest').split(' ')[0],
          last_name: (order.customer_name || 'Guest').split(' ').slice(1).join(' ') || 'Customer',
          state: 'NA',
        },
        special_reference: order.id,
      }),
    });

    const intentionData = await intentionRes.json();

    if (!intentionRes.ok || !intentionData.client_secret) {
      return new Response(
        JSON.stringify({ error: 'Payment provider error', details: intentionData }),
        { status: 502, headers: corsHeaders }
      );
    }

    await supabaseAdmin.from('orders').update({ paymob_order_id: intentionData.id ?? null }).eq('id', order.id);

    const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${PAYMOB_PUBLIC_KEY}&clientSecret=${intentionData.client_secret}`;

    return new Response(JSON.stringify({ checkout_url: checkoutUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});