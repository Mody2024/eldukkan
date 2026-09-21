// supabase/functions/shop-assistant/index.ts
//
// A real conversational shopping assistant backed by Gemini, with two
// tools: search_products (executed server-side against the live catalog)
// and add_to_cart (NEVER executed server-side — cart state lives in the
// customer's browser, and completing a purchase should always be a human
// action. This function only ever returns a *suggested* cart action for
// the frontend to carry out and show the customer, who still has to
// review their cart and tap "Place Order" themselves).
//
// Deploy: supabase functions deploy shop-assistant
// Requires: supabase secrets set GEMINI_API_KEY=...
//           supabase secrets set ASSISTANT_DAILY_LIMIT=30   (optional, defaults to 30)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  category: string | null;
  stock: number | null;
  rating: number | null;
}

const SEARCH_TOOL = {
  name: 'search_products',
  description: "Search the store's live product catalog by keyword, and optionally sort by rating or price.",
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Keyword to search product names/descriptions/categories for.' },
      sort: { type: 'string', enum: ['rating', 'price_asc', 'price_desc'], description: 'How to order results. Use "rating" for "best"/"top" requests.' },
    },
    required: ['query'],
  },
};

const CART_TOOL = {
  name: 'add_to_cart',
  description: 'Suggest adding a specific product (by its exact id from a previous search_products result) to the customer\'s cart. Only call this after search_products has found a specific matching product — never guess an id.',
  parameters: {
    type: 'object',
    properties: {
      product_id: { type: 'string' },
      quantity: { type: 'number' },
    },
    required: ['product_id'],
  },
};

async function callGemini(apiKey: string, contents: unknown[]) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents,
        tools: [{ functionDeclarations: [SEARCH_TOOL, CART_TOOL] }],
        systemInstruction: {
          parts: [{
            text: `You are a friendly, concise shopping assistant for an Egyptian online store called Eldukkan (an old word for "the shop"). 
Help customers find products and, when they clearly want to buy something ("buy me the best X", "get me a Y"), search for it and suggest adding the single best match to their cart.
Never invent products or prices — always use search_products first, never guess a product_id.
If a search returns multiple reasonable matches and the customer's request is ambiguous, ask a brief clarifying question instead of guessing.
Keep replies short (2-3 sentences max) and warm, not robotic.`,
          }],
        },
      }),
    }
  );
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Gemini API error: ${details}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history, identifier } = await req.json() as {
      message: string; history: ChatMessage[]; identifier: string;
    };

    if (!message || !identifier) {
      return new Response(JSON.stringify({ error: 'message and identifier are required' }), { status: 400, headers: corsHeaders });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Assistant not configured yet.' }), { status: 500, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase server configuration is missing.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ---------- daily rate limit, per identifier ----------
    const dailyLimit = parseInt(Deno.env.get('ASSISTANT_DAILY_LIMIT') || '30', 10);
    const today = new Date().toISOString().slice(0, 10);
    const { data: usageRow } = await supabaseAdmin
      .from('assistant_usage')
      .select('message_count')
      .eq('identifier', identifier)
      .eq('usage_date', today)
      .maybeSingle();

    if (usageRow && usageRow.message_count >= dailyLimit) {
      return new Response(JSON.stringify({
        reply: "You've reached today's chat limit for the assistant — come back tomorrow, or browse the catalog directly in the meantime!",
        limitReached: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabaseAdmin.from('assistant_usage').upsert(
      { identifier, usage_date: today, message_count: (usageRow?.message_count ?? 0) + 1 },
      { onConflict: 'identifier,usage_date' }
    );

    // ---------- build conversation for Gemini ----------
    const contents = [
      ...(history ?? []).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] },
    ];

    let response = await callGemini(GEMINI_API_KEY, contents);
    let parts = response.candidates?.[0]?.content?.parts ?? [];
    let functionCall = parts.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall as
      { id?: string; name: string; args: Record<string, unknown> } | undefined;

    let searchResults: Product[] = [];
    let suggestedAction: { type: 'add_to_cart'; product_id: string; quantity: number; product_name?: string } | null = null;

    // Up to 2 tool round-trips: a search, then possibly a follow-up
    // add_to_cart based on what the search found.
    for (let round = 0; round < 2 && functionCall; round++) {
      if (functionCall.name === 'search_products') {
        const query = String(functionCall.args.query ?? '').trim();
        const sort = String(functionCall.args.sort ?? '');

        // Keep catalog searches safe even when Gemini returns punctuation
        // or wildcard characters in the query.
        const safeQuery = query.replace(/[%_,()]/g, ' ').trim();

        let q = supabaseAdmin.from('products').select('id, name, description, price, sale_price, category, stock, rating')
          .or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`)
          .limit(5);
        if (sort === 'rating') q = q.order('rating', { ascending: false });
        else if (sort === 'price_asc') q = q.order('price', { ascending: true });
        else if (sort === 'price_desc') q = q.order('price', { ascending: false });
        const { data, error: searchError } = await q;
        if (searchError) throw new Error(`Catalog search failed: ${searchError.message}`);
        searchResults = data ?? [];

        // Gemini 3 function calls can contain a required thoughtSignature.
        // Re-send the COMPLETE model content instead of reconstructing only
        // the functionCall, otherwise the next Gemini request can fail.
        const modelContent = response.candidates?.[0]?.content;
        if (!modelContent) throw new Error('Gemini returned an incomplete tool call.');

        contents.push(modelContent);
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: 'search_products',
              id: functionCall.id,
              response: { results: searchResults },
            },
          }],
        });
      } else if (functionCall.name === 'add_to_cart') {
        const productId = String(functionCall.args.product_id ?? '');
        const match = searchResults.find((p) => p.id === productId);
        if (match) {
          suggestedAction = { type: 'add_to_cart', product_id: match.id, quantity: Number(functionCall.args.quantity) || 1, product_name: match.name };
        }
        break; // don't loop further — this is the terminal action
      }

      response = await callGemini(GEMINI_API_KEY, contents);
      parts = response.candidates?.[0]?.content?.parts ?? [];
      functionCall = parts.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall as
        { id?: string; name: string; args: Record<string, unknown> } | undefined;
    }

    const textPart = parts.find((p: { text?: string }) => p.text)?.text as string | undefined;
    const reply = textPart || (suggestedAction ? `Added ${suggestedAction.product_name} to your cart — head to checkout whenever you're ready!` : "I'm here to help you find something — what are you looking for?");

    return new Response(JSON.stringify({
      reply,
      products: searchResults.length > 0 ? searchResults : undefined,
      action: suggestedAction ?? undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});