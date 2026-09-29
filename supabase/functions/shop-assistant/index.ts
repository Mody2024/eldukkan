import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface ChatMessage { role: 'user' | 'model'; text: string; }
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  category: string | null;
  stock: number | null;
  rating: number | null;
  image_url: string | null;
}
interface AiStatus {
  enabled: boolean;
  guestEnabled: boolean;
  unlimited: boolean;
  balance: number;
  nextRenewalAt: string;
  renewalCredits: number;
  renewalIntervalMinutes: number;
  messageCost: number;
  searchCost: number;
  actionCost: number;
  safeMode: boolean;
  requireConfirmation: boolean;
  memoryEnabled: boolean;
  aiDisabled: boolean;
  actionPermissions: Record<string, boolean>;
}

const SEARCH_TOOL = {
  name: 'search_products',
  description: "Search the store's live product catalog. Use structured constraints for budgets, categories, stock, and sale requests instead of putting those constraints into the keyword.",
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Short product/category keyword, without budget words.' },
      category: { type: 'string', description: 'Exact category when known from the catalog context.' },
      min_price: { type: 'number', description: 'Minimum effective price in EGP.' },
      max_price: { type: 'number', description: 'Maximum effective price in EGP.' },
      on_sale: { type: 'boolean', description: 'Only return products currently on sale.' },
      in_stock: { type: 'boolean', description: 'When true, exclude out-of-stock products.' },
      sort: { type: 'string', enum: ['rating', 'price_asc', 'price_desc'], description: 'Sort by rating or price when requested.' },
    },
    required: ['query'],
  },
};

const CART_TOOL = {
  name: 'add_to_cart',
  description: 'Suggest adding a specific product by exact id from a previous search_products result. Never guess an id.',
  parameters: {
    type: 'object',
    properties: {
      product_id: { type: 'string' },
      quantity: { type: 'number' },
    },
    required: ['product_id'],
  },
};

const CART_CHANGE_TOOL = {
  name: 'change_cart',
  description: 'Suggest a reversible change to an item already in the current customer cart. Never use it for checkout or payment.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['remove', 'set_quantity'] },
      product_id: { type: 'string' },
      quantity: { type: 'number' },
    },
    required: ['action', 'product_id'],
  },
};

const UI_TOOLS = [
  {
    name: 'navigate',
    description: 'Open a safe internal storefront page. Use paths beginning with /. Never use external URLs or private admin paths.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, label: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'set_theme',
    description: 'Change the customer storefront theme between light and dark.',
    parameters: {
      type: 'object',
      properties: { theme: { type: 'string', enum: ['light', 'dark'] } },
      required: ['theme'],
    },
  },
  {
    name: 'set_language',
    description: 'Change the storefront language.',
    parameters: {
      type: 'object',
      properties: { language: { type: 'string', enum: ['en', 'ar'] } },
      required: ['language'],
    },
  },
  {
    name: 'set_experience',
    description: 'Change the storefront experience. Modern is the default; heritage and easy are alternatives.',
    parameters: {
      type: 'object',
      properties: { experience: { type: 'string', enum: ['modern', 'heritage', 'easy'] } },
      required: ['experience'],
    },
  },
  {
    name: 'start_guided',
    description: 'Start a step-by-step guided shopping task. Keep it practical and use only valid targets: search, products, products-grid, cart, checkout, product-add, ai, language, theme, experience.',
    parameters: {
      type: 'object',
      properties: {
        goal: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              target: { type: 'string' },
              path: { type: 'string' },
            },
            required: ['label', 'target'],
          },
        },
      },
      required: ['goal', 'steps'],
    },
  },
  {
    name: 'spotlight',
    description: 'Highlight one safe storefront control for the customer.',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        label: { type: 'string' },
      },
      required: ['target'],
    },
  },
];

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function bearerToken(req: Request) {
  const value = req.headers.get('Authorization') || '';
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

async function identifyUser(supabaseAdmin: ReturnType<typeof createClient>, req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ?? null;
}

async function getGlobalSettings(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data, error } = await supabaseAdmin.from('ai_credit_settings').select('*').eq('id', true).single();
  if (error || !data) throw new Error('AI control settings are missing.');
  return data;
}

async function syncWallet(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string | null,
  identifier: string | null
): Promise<AiStatus> {
  const { data, error } = await supabaseAdmin.rpc('ai_sync_wallet', {
    p_user_id: userId,
    p_identifier: identifier,
  });
  if (error) throw new Error('AI wallet sync failed: ' + error.message);
  return data as AiStatus;
}

async function logActivity(
  supabaseAdmin: ReturnType<typeof createClient>,
  values: {
    userId: string | null;
    identifier: string;
    eventType: string;
    credits: number;
    success: boolean;
    metadata?: Record<string, unknown>;
  }
) {
  await supabaseAdmin.from('ai_activity_log').insert([{
    user_id: values.userId,
    identifier: values.identifier,
    event_type: values.eventType,
    credits_charged: values.credits,
    success: values.success,
    metadata: values.metadata ?? null,
  }]);
}

async function saveMemory(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  enabled: boolean,
  message: string,
  reply: string,
  context: Record<string, unknown>,
  searchResults: Product[] = []
) {
  if (!enabled) return;

  const { data } = await supabaseAdmin.from('ai_memory').select('preferences, recent_history').eq('user_id', userId).maybeSingle();
  const preferences = (data?.preferences && typeof data.preferences === 'object') ? { ...(data.preferences as Record<string, unknown>) } : {};
  const categoryCounts = { ...((preferences.category_interest_counts as Record<string, number>) || {}) };

  for (const category of searchResults.map((p) => p.category).filter(Boolean).slice(0, 3) as string[]) {
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }

  preferences.last_language = typeof context.language === 'string' ? context.language : preferences.last_language;
  preferences.last_theme = typeof context.theme === 'string' ? context.theme : preferences.last_theme;
  preferences.last_page = typeof context.page === 'string' ? context.page : preferences.last_page;
  preferences.last_category = searchResults.find((p) => p.category)?.category ?? preferences.last_category;
  preferences.category_interest_counts = Object.fromEntries(
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  );

  const currentHistory = Array.isArray(data?.recent_history) ? data.recent_history : [];
  const recentHistory = [
    ...currentHistory,
    { role: 'user', text: message },
    { role: 'model', text: reply },
  ].slice(-12);

  await supabaseAdmin.from('ai_memory').upsert({
    user_id: userId,
    enabled: true,
    preferences,
    recent_history: recentHistory,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

async function recordMemoryEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  event: Record<string, unknown>
) {
  const { data } = await supabaseAdmin.from('ai_memory').select('preferences').eq('user_id', userId).maybeSingle();
  const preferences = (data?.preferences && typeof data.preferences === 'object') ? { ...(data.preferences as Record<string, unknown>) } : {};
  const products = Array.isArray(preferences.interested_products)
    ? [...preferences.interested_products as { id: string; name: string; count: number }[]]
    : [];

  if (event.type === 'add_to_cart' && typeof event.productId === 'string') {
    const index = products.findIndex((item) => item.id === event.productId);
    if (index >= 0) products[index] = { ...products[index], count: products[index].count + 1 };
    else products.push({ id: event.productId, name: String(event.productName || 'Product'), count: 1 });
  }

  preferences.interested_products = products.sort((a, b) => b.count - a.count).slice(0, 8);
  await supabaseAdmin.from('ai_memory').upsert({
    user_id: userId,
    enabled: true,
    preferences,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

async function callGemini(
  apiKey: string,
  contents: unknown[],
  options: { allowCart: boolean; memory: Record<string, unknown>; context: Record<string, unknown>; allowNavigation: boolean }
) {
  const selectedUiTools = options.allowNavigation
    ? UI_TOOLS
    : UI_TOOLS.filter((tool) => tool.name !== 'navigate');
  const tools = [{ functionDeclarations: [SEARCH_TOOL, ...(options.allowCart ? [CART_TOOL, CART_CHANGE_TOOL] : []), ...selectedUiTools] }];
  const payload = {
    contents,
    tools,
    systemInstruction: {
      parts: [{
        text: `You are Eldukkan's friendly shopping assistant for an Egyptian online store.\nBe concise, practical, and warm. Never invent products, prices, stock, ids, coupons, policies, or page elements.\nUse search_products before recommending a specific catalog product. Only use add_to_cart with an exact id returned by search_products.\nRead the current page map in shopping context before choosing a guided target. Target names must come from that live page map or a stable target already exposed by the storefront.\nGuided Mode is assistance, not automation: never click, type, submit, buy, or navigate for the customer. When guided mode is active, highlight the next thing the customer should act on, then wait for the customer to act.\nDo not navigate unless the customer explicitly asked you to open, go to, navigate to, or show another page.\nWhen the customer asks to be guided, use start_guided with a continuous sequence of concrete on-page targets. Prefer several small steps over one large step. Do not include navigation paths in guide steps.\nThe customer is always the final actor for checkout and irreversible actions; never submit or cancel an order.\nCurrent shopping context: ${JSON.stringify(options.context).slice(0, 5000)}\nRemembered shopping preferences: ${JSON.stringify(options.memory).slice(0, 2500)}
`,
      }],
    },
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) return response.json();
    const details = await response.text();
    if ((response.status === 429 || response.status === 503) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      continue;
    }
    throw new Error(`Gemini API error (${response.status}, model ${GEMINI_MODEL}): ${details}`);
  }
  throw new Error('Gemini API request failed after retries.');
}

async function runAssistant(
  supabaseAdmin: ReturnType<typeof createClient>,
  apiKey: string,
  message: string,
  history: ChatMessage[],
  status: AiStatus,
  userId: string | null,
  identifier: string,
  context: Record<string, unknown>,
  memory: Record<string, unknown>,
  requestId?: string,
) {
  const contents = [
    ...(history || []).slice(-8).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const allowCart = status.actionPermissions?.add_to_cart !== false && context.guidedMode !== true;
  const allowGuided = status.actionPermissions?.start_guided_mode !== false;
  const allowNavigation = context.userAskedToNavigate === true;
  let response = await callGemini(apiKey, contents, { allowCart, memory, context, allowNavigation });
  let parts = response.candidates?.[0]?.content?.parts ?? [];
  let functionCall = parts.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall as
    { id?: string; name: string; args: Record<string, unknown> } | undefined;

  let searchResults: Product[] = [];
  let suggestedAction: { type: 'add_to_cart' | 'change_cart'; product_id: string; quantity: number; action?: 'remove' | 'set_quantity'; product_name?: string; requiresConfirmation: boolean; creditCost: number } | null = null;
  let searchUsed = false;

  const toolTrace: { tool: string; input?: Record<string, unknown>; resultCount?: number }[] = [];

  const uiActions: Record<string, unknown>[] = [];
  const stableTargets = new Set(['search', 'search-trigger', 'products', 'products-grid', 'cart', 'checkout', 'product-add', 'ai', 'language', 'theme', 'experience', 'product-detail', 'cart-items', 'checkout-form', 'place-order', 'wishlist', 'account', 'mobile-nav']);
  const pageMap = Array.isArray(context.pageMap) ? context.pageMap as { target?: unknown }[] : [];
  const pageTargets = new Set(pageMap.map((item) => String(item.target || '')).filter((target) => /^[A-Za-z0-9_-]{1,80}$/.test(target)));
  const validTarget = (target: string) => stableTargets.has(target) || pageTargets.has(target);
  const validPaths = (path: string) => {
    if (!path.startsWith('/') || path.startsWith('/ops-console')) return null;
    return path.slice(0, 220);
  };
  const acknowledgeUiTool = (name: string, id?: string, result: Record<string, unknown> = { ok: true }) => {
    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);
    contents.push({
      role: 'user',
      parts: [{ functionResponse: { name, id, response: result } }],
    });
  };

  for (let round = 0; round < 5 && functionCall; round += 1) {
    if (functionCall.name === 'search_products') {
      if (status.actionPermissions?.search_products === false) break;
      const query = String(functionCall.args.query ?? '').trim().slice(0, 120);
      const sort = String(functionCall.args.sort ?? '');
      const category = String(functionCall.args.category ?? '').trim().slice(0, 120);
      const minPrice = Number(functionCall.args.min_price);
      const maxPrice = Number(functionCall.args.max_price);
      const onSale = functionCall.args.on_sale === true;
      const inStock = functionCall.args.in_stock !== false;
      const safeQuery = query.replace(/[%_,()]/g, ' ').trim();
      if (!safeQuery) break;

      let q = supabaseAdmin
        .from('products')
        .select('id, name, description, price, sale_price, sale_ends_at, category, stock, rating, review_count, image_url')
        .eq('is_active', true)
        .or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`)
        .limit(25);

      if (category) q = q.eq('category', category);
      if (Number.isFinite(minPrice)) q = q.gte('price', Math.max(0, minPrice));
      if (Number.isFinite(maxPrice)) q = q.lte('price', Math.max(0, maxPrice));
      if (inStock) q = q.gt('stock', 0);
      if (sort === 'rating') q = q.order('rating', { ascending: false });
      else if (sort === 'price_asc') q = q.order('price', { ascending: true });
      else if (sort === 'price_desc') q = q.order('price', { ascending: false });

      const { data, error } = await q;
      if (error) throw new Error('Catalog search failed: ' + error.message);
      const now = Date.now();
      searchResults = ((data ?? []) as (Product & { sale_ends_at?: string | null; review_count?: number | null })[])
        .filter((product) => {
          const saleActive = Number(product.sale_price ?? 0) > 0
            && (!product.sale_ends_at || new Date(product.sale_ends_at).getTime() > now);
          const effectivePrice = saleActive ? Number(product.sale_price) : Number(product.price);
          return (!onSale || saleActive)
            && (!Number.isFinite(minPrice) || effectivePrice >= minPrice)
            && (!Number.isFinite(maxPrice) || effectivePrice <= maxPrice)
            && (!inStock || Number(product.stock ?? 0) > 0);
        })
        .slice(0, 8) as Product[];
      searchUsed = true;
      toolTrace.push({
        tool: 'search_products',
        input: {
          query: safeQuery,
          category: category || null,
          min_price: Number.isFinite(minPrice) ? minPrice : null,
          max_price: Number.isFinite(maxPrice) ? maxPrice : null,
          on_sale: onSale,
          in_stock: inStock,
          sort,
        },
        resultCount: searchResults.length
      });

      const modelContent = response.candidates?.[0]?.content;
      if (!modelContent) throw new Error('Gemini returned an incomplete tool call.');
      contents.push(modelContent);
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: 'search_products', id: functionCall.id, response: { results: searchResults } } }],
      });
    } else if (functionCall.name === 'add_to_cart') {
      if (!allowCart) break;
      const productId = String(functionCall.args.product_id ?? '');
      const match = searchResults.find((p) => p.id === productId && Number(p.stock ?? 0) > 0);
      if (match) {
        const quantity = Math.max(1, Math.min(10, Math.floor(Number(functionCall.args.quantity) || 1)));
        suggestedAction = {
          type: 'add_to_cart',
          product_id: match.id,
          quantity,
          product_name: match.name,
          requiresConfirmation: Boolean(status.safeMode || status.requireConfirmation || status.actionCost > 0),
          creditCost: status.actionCost,
        };
        toolTrace.push({ tool: 'add_to_cart', input: { product_id: match.id, quantity }, resultCount: 1 });
      }
      break;
    } else if (functionCall.name === 'change_cart') {
      if (!allowCart) break;
      const action = String(functionCall.args.action ?? '');
      const productId = String(functionCall.args.product_id ?? '');
      const cartItems = Array.isArray(context.cart?.items) ? context.cart.items as { id?: unknown; name?: unknown; quantity?: unknown }[] : [];
      const current = cartItems.find((item) => String(item.id || '') === productId);
      if ((action === 'remove' || action === 'set_quantity') && current) {
        const quantity = action === 'remove' ? 0 : Math.max(1, Math.min(10, Math.floor(Number(functionCall.args.quantity) || 1)));
        suggestedAction = {
          type: 'change_cart',
          action: action as 'remove' | 'set_quantity',
          product_id: productId,
          quantity,
          product_name: String(current.name || 'cart item'),
          requiresConfirmation: true,
          creditCost: status.actionCost,
        };
        toolTrace.push({ tool: 'change_cart', input: { action, product_id: productId, quantity }, resultCount: 1 });
      }
      break;
    } else if (functionCall.name === 'navigate') {
      if (!allowNavigation) break;
      const path = String(functionCall.args.path ?? '');
      if (path === '/checkout' && status.actionPermissions?.open_checkout === false) break;
      const path = validPaths(String(functionCall.args.path ?? ''));
      if (path) {
        uiActions.push({ type: 'navigate', path, label: String(functionCall.args.label ?? '').slice(0, 100) });
        toolTrace.push({ tool: 'navigate', input: { path } });
        acknowledgeUiTool('navigate', functionCall.id, { ok: true, path });
      }
    } else if (functionCall.name === 'set_theme') {
      if (status.actionPermissions?.change_theme === false) break;
      const value = String(functionCall.args.theme ?? '');
      if (value === 'light' || value === 'dark') {
        uiActions.push({ type: 'set_theme', theme: value });
        toolTrace.push({ tool: 'set_theme', input: { theme: value } });
        acknowledgeUiTool('set_theme', functionCall.id, { ok: true, theme: value });
      }
    } else if (functionCall.name === 'set_language') {
      if (status.actionPermissions?.change_language === false) break;
      const value = String(functionCall.args.language ?? '');
      if (value === 'en' || value === 'ar') {
        uiActions.push({ type: 'set_language', language: value });
        toolTrace.push({ tool: 'set_language', input: { language: value } });
        acknowledgeUiTool('set_language', functionCall.id, { ok: true, language: value });
      }
    } else if (functionCall.name === 'set_experience') {
      if (status.actionPermissions?.change_experience === false) break;
      const value = String(functionCall.args.experience ?? '');
      if (value === 'modern' || value === 'heritage' || value === 'easy') {
        uiActions.push({ type: 'set_experience', experience: value });
        toolTrace.push({ tool: 'set_experience', input: { experience: value } });
        acknowledgeUiTool('set_experience', functionCall.id, { ok: true, experience: value });
      }
    } else if (functionCall.name === 'start_guided') {
      if (!allowGuided) break;
      const rawSteps = Array.isArray(functionCall.args.steps) ? functionCall.args.steps : [];
      const steps = rawSteps
        .slice(0, 10)
        .map((step: Record<string, unknown>) => ({
          label: String(step.label ?? 'Next step').slice(0, 140),
          target: String(step.target ?? ''),
        }))
        .filter((step) => validTarget(step.target));
      if (steps.length) {
        uiActions.push({
          type: 'start_guided',
          goal: String(functionCall.args.goal ?? 'Guided shopping').slice(0, 160),
          steps,
        });
        toolTrace.push({ tool: 'start_guided', input: { stepCount: steps.length } });
        acknowledgeUiTool('start_guided', functionCall.id, { ok: true, stepCount: steps.length });
      }
    } else if (functionCall.name === 'spotlight') {
      if (!allowGuided) break;
      const target = String(functionCall.args.target ?? '');
      if (validTarget(target)) {
        uiActions.push({
          type: 'spotlight',
          target,
          label: String(functionCall.args.label ?? target).slice(0, 100),
          goal: 'Guided shopping',
        });
        toolTrace.push({ tool: 'spotlight', input: { target } });
        acknowledgeUiTool('spotlight', functionCall.id, { ok: true, target });
      }
    } else {
      break;
    }

    response = await callGemini(apiKey, contents, { allowCart, memory, context, allowNavigation });
    parts = response.candidates?.[0]?.content?.parts ?? [];
    functionCall = parts.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall as
      { id?: string; name: string; args: Record<string, unknown> } | undefined;
  }

  const textPart = parts.find((p: { text?: string }) => p.text)?.text as string | undefined;
  const reply = textPart
    || (suggestedAction ? (suggestedAction.requiresConfirmation
      ? `I found ${suggestedAction.product_name}. Confirm below and I'll add it to your cart.`
      : `I found ${suggestedAction.product_name} and added it to your cart.`)
      : "Tell me what you're looking for and I'll search the store.");

  const estimatedCost = status.messageCost + (searchUsed ? status.searchCost : 0);
  const chargeRequestId = requestId ? `message:${requestId}` : `message:${crypto.randomUUID()}`;
  const charge = await supabaseAdmin.rpc('ai_consume_credits', {
    p_user_id: userId,
    p_identifier: userId ? null : identifier,
    p_cost: estimatedCost,
    p_request_id: chargeRequestId,
    p_event_type: 'message',
    p_reason: 'AI assistant message',
    p_metadata: { searched: searchUsed, suggestedAction: Boolean(suggestedAction) },
  });

  if (charge.error) throw new Error('Credit charge failed: ' + charge.error.message);
  const chargedState = charge.data as Record<string, unknown>;
  if (!chargedState?.ok) {
    return {
      reply: `You don't have enough AI credits for this request. You currently have ${Number(chargedState?.balance ?? status.balance)} credits; this request needs ${estimatedCost}.`,
      credits: chargedState,
      insufficientCredits: true,
    };
  }

  await logActivity(supabaseAdmin, {
    userId,
    identifier,
    eventType: 'message',
    credits: estimatedCost,
    success: true,
    metadata: {
      searched: searchUsed,
      suggestedAction: Boolean(suggestedAction),
      toolTrace,
    },
  });

  await saveMemory(
    supabaseAdmin,
    userId || '',
    Boolean(userId && status.memoryEnabled),
    message,
    reply,
    context,
    searchResults
  );

  return {
    reply,
    products: searchResults.length ? searchResults : undefined,
    action: suggestedAction ?? undefined,
    credits: chargedState,
    toolTrace,
    uiActions: uiActions.length ? uiActions : undefined,
    estimatedCost,
  };
}

async function runPlayground(
  supabaseAdmin: ReturnType<typeof createClient>,
  apiKey: string,
  message: string,
  settings: Record<string, unknown>
) {
  const status: AiStatus = {
    enabled: true,
    guestEnabled: true,
    unlimited: true,
    balance: 0,
    nextRenewalAt: new Date().toISOString(),
    renewalCredits: Number(settings.renewal_credits || 0),
    renewalIntervalMinutes: Number(settings.renewal_interval_minutes || 1440),
    messageCost: Number(settings.message_cost || 0),
    searchCost: Number(settings.search_cost || 0),
    actionCost: Number(settings.action_cost || 0),
    safeMode: true,
    requireConfirmation: true,
    memoryEnabled: false,
    aiDisabled: false,
    actionPermissions: (settings.action_permissions || {}) as Record<string, boolean>,
  };

  const result = await runAssistant(
    supabaseAdmin,
    apiKey,
    message,
    [],
    status,
    null,
    'admin-playground',
    { page: '/admin', language: 'en', theme: 'light' },
    {}
  );

  return {
    ...result,
    estimatedCost: Number(result.estimatedCost || 0),
    credits: undefined,
    note: 'Playground calls do not charge customer credits or save customer memory.',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!GEMINI_API_KEY || !supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Assistant server configuration is missing.' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const user = await identifyUser(supabaseAdmin, req);
    const body = await req.json() as {
      mode?: 'chat' | 'status' | 'playground' | 'confirm_action' | 'remember_event' | 'admin_users';
      message?: string;
      history?: ChatMessage[];
      identifier?: string;
      requestId?: string;
      context?: Record<string, unknown>;
      action?: { type: 'add_to_cart' | 'change_cart'; product_id: string; quantity?: number; product_name?: string; action?: 'remove' | 'set_quantity' };
      event?: Record<string, unknown>;
    };

    const mode = body.mode || 'chat';
    const settings = await getGlobalSettings(supabaseAdmin);
    const identifier = user ? `user:${user.id}` : String(body.identifier || '');

    if (mode === 'admin_users') {
      const adminRow = user
        ? await supabaseAdmin
          .from('admin_users')
          .select('role, permissions')
          .eq('email', (user.email || '').toLowerCase())
          .maybeSingle()
        : { data: null };
      const adminPermissions = Array.isArray(adminRow.data?.permissions) ? adminRow.data?.permissions as string[] : [];
      if (!user || (!adminRow.data) || (adminRow.data.role !== 'owner' && !adminPermissions.includes('manage_ai'))) {
        return json({ error: 'AI management permission required.' }, 403);
      }

      const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) return json({ error: 'Could not load customer directory: ' + usersError.message }, 500);

      const [{ data: overrides }, { data: wallets }] = await Promise.all([
        supabaseAdmin.from('ai_user_settings').select('*').limit(1000),
        supabaseAdmin.from('ai_user_wallets').select('*').limit(1000),
      ]);
      const overrideMap = new Map((overrides ?? []).map((row: Record<string, unknown>) => [String(row.user_id), row]));
      const walletMap = new Map((wallets ?? []).map((row: Record<string, unknown>) => [String(row.user_id), row]));

      const rows = (authUsers.users ?? []).map((customer) => {
        const override = overrideMap.get(customer.id) || {
          user_id: customer.id,
          email: customer.email || '',
          daily_credits_override: null,
          message_cost_override: null,
          search_cost_override: null,
          action_cost_override: null,
          renewal_interval_minutes_override: null,
          max_balance_override: null,
          carry_over_override: null,
          unlimited_override: null,
          ai_disabled: false,
          memory_enabled: true,
          safe_mode_override: null,
          require_confirmation_override: null,
        };
        return {
          ...override,
          user_id: customer.id,
          email: customer.email || String(override.email || ''),
          wallet: walletMap.get(customer.id) || null,
          created_at: customer.created_at,
          last_sign_in_at: customer.last_sign_in_at,
        };
      });

      return json({ users: rows });
    }

    if (mode === 'playground') {
      const isAdmin = user ? await supabaseAdmin.from('admin_users').select('role, permissions').eq('email', (user.email || '').toLowerCase()).maybeSingle() : { data: null };
      const role = isAdmin.data?.role;
      const permissions = Array.isArray(isAdmin.data?.permissions) ? isAdmin.data?.permissions as string[] : [];
      if (!user || (!isAdmin.data) || (role !== 'owner' && !permissions.includes('manage_ai'))) {
        return json({ error: 'AI management permission required.' }, 403);
      }
      const result = await runPlayground(supabaseAdmin, GEMINI_API_KEY, String(body.message || '').trim(), settings);
      return json(result);
    }

    if (mode === 'status' || mode === 'chat' || mode === 'confirm_action') {
      if (!user && !identifier) return json({ error: 'Guest identifier is required.' }, 400);
      if (!settings.enabled) return json({ enabled: false, reply: 'The AI assistant is currently paused by the store.' });
      if (!user && !settings.guest_enabled) return json({ enabled: false, reply: 'Guest AI is currently disabled. Sign in to use the assistant.' });

      if (user) {
        await supabaseAdmin.from('ai_user_settings').upsert(
          { user_id: user.id, email: user.email || '' },
          { onConflict: 'user_id' }
        );
      }

      const status = await syncWallet(supabaseAdmin, user?.id ?? null, user ? null : identifier);

      if (status.aiDisabled) return json({ ...status, enabled: false, reply: 'AI has been disabled for this account.' });

      if (mode === 'status') {
        const { data: memory } = user
          ? await supabaseAdmin.from('ai_memory').select('enabled, preferences').eq('user_id', user.id).maybeSingle()
          : { data: null };
        return json({
          ...status,
          memory: memory ? { enabled: memory.enabled, preferences: memory.preferences } : { enabled: status.memoryEnabled, preferences: {} },
        });
      }

      if (mode === 'confirm_action') {
        if (!body.action || !['add_to_cart', 'change_cart'].includes(body.action.type)) return json({ error: 'Unsupported action.' }, 400);
        if (status.actionPermissions?.add_to_cart === false) return json({ error: 'AI cart actions are disabled.' }, 403);

        const productId = body.action.product_id;
        const quantity = Math.max(0, Math.min(10, Math.floor(Number(body.action.quantity) || 0)));
        const isChange = body.action.type === 'change_cart';
        if (isChange && !['remove', 'set_quantity'].includes(String(body.action.action || ''))) {
          return json({ error: 'Unsupported cart change.' }, 400);
        }

        let product: Record<string, unknown> | null = null;
        if (!isChange) {
          const { data: productRow, error: productError } = await supabaseAdmin
            .from('products')
            .select('id,name,description,price,sale_price,category,stock,rating,image_url')
            .eq('id', productId)
            .eq('is_active', true)
            .maybeSingle();

          if (productError) throw new Error('Could not validate product: ' + productError.message);
          if (!productRow || Number(productRow.stock ?? 0) <= 0) return json({ error: 'That product is no longer available.' }, 409);
          product = productRow as Record<string, unknown>;
        }

        const charge = await supabaseAdmin.rpc('ai_consume_credits', {
          p_user_id: user?.id ?? null,
          p_identifier: user ? null : identifier,
          p_cost: status.actionCost,
          p_request_id: body.requestId ? `action:${body.requestId}` : `action:${crypto.randomUUID()}`,
          p_event_type: 'action',
          p_reason: isChange ? 'AI cart change action' : 'AI add-to-cart action',
          p_metadata: { product_id: productId, quantity, action: body.action.action || 'add_to_cart' },
        });
        if (charge.error) throw new Error('Action credit charge failed: ' + charge.error.message);
        if (!(charge.data as Record<string, unknown>)?.ok) return json({ ...(charge.data as object), error: 'Not enough credits for this AI action.' }, 402);

        return json({
          allowed: true,
          action: body.action.action || 'add_to_cart',
          product,
          quantity,
          credits: charge.data,
        });
        await logActivity(supabaseAdmin, {
          userId: user?.id ?? null,
          identifier,
          eventType: 'add_to_cart',
          credits: status.actionCost,
          success: true,
          metadata: { product_id: productId, quantity },
        });

        return json({
          allowed: true,
          product,
          quantity,
          credits: charge.data,
        });
      }

      if (mode === 'remember_event') {
        if (user) await recordMemoryEvent(supabaseAdmin, user.id, body.event || {});
        return json({ ok: true });
      }

      const message = String(body.message || '').trim();
      if (!message) return json({ error: 'message is required' }, 400);

      let memory: Record<string, unknown> = {};
      let effectiveHistory = Array.isArray(body.history) ? body.history : [];
      if (user && status.memoryEnabled) {
        const { data: memoryRow } = await supabaseAdmin.from('ai_memory').select('enabled, preferences, recent_history').eq('user_id', user.id).maybeSingle();
        if (memoryRow?.enabled !== false) {
          memory = (memoryRow?.preferences && typeof memoryRow.preferences === 'object') ? memoryRow.preferences as Record<string, unknown> : {};
          effectiveHistory = Array.isArray(memoryRow?.recent_history) ? memoryRow.recent_history as ChatMessage[] : effectiveHistory;
        }
      }

      if (user) {
        const { data: preferencesRow } = await supabaseAdmin
          .from('customer_preferences')
          .select('preferred_categories, budget_band, shopping_goal, assistant_mode, language, experience, theme')
          .eq('user_id', user.id)
          .maybeSingle();

        if (preferencesRow) {
          memory = {
            ...memory,
            explicit_customer_preferences: {
              categories: preferencesRow.preferred_categories ?? [],
              budget_band: preferencesRow.budget_band ?? null,
              shopping_goal: preferencesRow.shopping_goal ?? null,
              assistant_mode: preferencesRow.assistant_mode ?? null,
              language: preferencesRow.language ?? null,
              experience: preferencesRow.experience ?? null,
              theme: preferencesRow.theme ?? null,
            },
          };
        }
      }

      const result = await runAssistant(
        supabaseAdmin,
        GEMINI_API_KEY,
        message,
        effectiveHistory,
        status,
        user?.id ?? null,
        identifier,
        body.context || {},
        memory,
        body.requestId
      );

      return json(result);
    }

    return json({ error: 'Unsupported mode.' }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown assistant error' }, 500);
  }
});
