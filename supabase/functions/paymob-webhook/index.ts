// supabase/functions/paymob-webhook/index.ts
//
// Paymob calls this URL after every transaction attempt. We verify the
// HMAC signature (proves the request really came from Paymob, not someone
// spoofing a "payment succeeded" call) then flip the order's
// payment_status. This is what makes payment status real — never trust a
// "success" redirect in the browser alone, since a customer can navigate
// there without actually paying.
//
// Deploy: supabase functions deploy paymob-webhook --no-verify-jwt
// (--no-verify-jwt because Paymob calls this directly, not through your app's auth)
//
// After deploying, copy the function URL into:
//   Paymob Dashboard → Developers → Webhooks → paste URL, select "Transaction" callback
//
// Requires: supabase secrets set PAYMOB_HMAC_SECRET=...  (from Paymob Dashboard → Settings → Payment Integrations → HMAC)

import { createClient } from 'jsr:@supabase/supabase-js@2';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyHmac(obj: Record<string, unknown>, receivedHmac: string, secret: string): Promise<boolean> {
  // Field order and concatenation per Paymob's documented "Transaction
  // Processed Callback" HMAC calculation. Verify this list against
  // Paymob's current docs during setup — this is the part most likely to
  // drift if they change their API.
  const fields = [
    'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
    'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
    'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
    'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
  ];

  const getPath = (o: Record<string, unknown>, path: string) =>
    path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), o);

  const concatenated = fields.map((f) => {
    const v = getPath(obj, f);
    return v === undefined || v === null ? '' : String(v);
  }).join('');

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(concatenated));
  const computedHex = toHex(signature);

  return computedHex.toLowerCase() === receivedHmac.toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const receivedHmac = url.searchParams.get('hmac') || '';
    const body = await req.json();
    const transaction = body.obj ?? body;

    const secret = Deno.env.get('PAYMOB_HMAC_SECRET');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'PAYMOB_HMAC_SECRET not configured' }), { status: 500 });
    }

    const isValid = await verifyHmac(transaction, receivedHmac, secret);
    if (!isValid) {
      // Don't process anything on a bad signature — this is the actual
      // security boundary that prevents a spoofed "payment succeeded" call.
      return new Response(JSON.stringify({ error: 'Invalid HMAC signature' }), { status: 401 });
    }

    const orderId = transaction.order?.merchant_order_id || transaction.order?.id;
    const success = transaction.success === true && transaction.error_occured !== true;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (orderId) {
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: success ? 'paid' : 'failed',
          paymob_transaction_id: String(transaction.id ?? ''),
        })
        .or(`id.eq.${orderId},paymob_order_id.eq.${orderId}`);
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
});