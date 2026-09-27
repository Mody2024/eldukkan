-- Update 3: AI onboarding lifecycle, editable publishing, and reliable admin AI settings.
-- Draft onboarding content never becomes user-visible until explicitly published.

create table if not exists public.ai_onboarding_config (
  id boolean primary key default true check (id = true),
  enabled boolean not null default true,
  published_version integer not null default 1,
  published_content jsonb not null default '{}'::jsonb,
  draft_content jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  draft_updated_at timestamptz not null default now(),
  updated_by uuid null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_user_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_version integer not null default 0,
  last_seen_version integer not null default 0,
  completed_at timestamptz null,
  updated_at timestamptz not null default now()
);

insert into public.ai_onboarding_config (id, published_version, published_content, draft_content)
values (
  true,
  1,
  jsonb_build_object(
    'title_en','Welcome to ElDukkan',
    'title_ar','أهلاً بك في الدكان',
    'intro_en','A quick tour so you know where everything is. You stay in control while the assistant guides you.',
    'intro_ar','جولة سريعة تعرفك على المكان. أنت دائمًا المتحكم والمساعد يوجّهك فقط.',
    'steps', jsonb_build_array(
      jsonb_build_object(
        'id','welcome',
        'badge_en','Welcome',
        'badge_ar','أهلاً بك',
        'title_en','Your store, your way',
        'title_ar','متجرك بطريقتك',
        'body_en','ElDukkan keeps shopping simple: search, compare, add to cart, then check out when you are ready.',
        'body_ar','الدكان بيخلّي التسوق بسيط: ابحث، قارن، ضيف للسلة، وبعدها كمّل الشراء وقت ما تكون جاهز.',
        'primary_en','Show me around',
        'primary_ar','ورّيني المكان',
        'secondary_en','Skip tour',
        'secondary_ar','تخطي الجولة',
        'primary_action','next',
        'secondary_action','skip'
      ),
      jsonb_build_object(
        'id','search',
        'badge_en','Find anything',
        'badge_ar','دوّر بسهولة',
        'title_en','Start with search',
        'title_ar','ابدأ بالبحث',
        'body_en','Use the search box or ask the AI assistant to find products by name, category, budget, rating, or what you need.',
        'body_ar','استخدم البحث أو اطلب من المساعد يدوّر لك بالاسم أو الفئة أو الميزانية أو التقييم أو احتياجك.',
        'primary_en','Next',
        'primary_ar','التالي',
        'secondary_en','Back',
        'secondary_ar','رجوع',
        'primary_action','next',
        'secondary_action','back'
      ),
      jsonb_build_object(
        'id','ai',
        'badge_en','Shopping assistant',
        'badge_ar','مساعد التسوق',
        'title_en','Ask before you click',
        'title_ar','اسأل قبل ما تدوس',
        'body_en','The assistant can read the current storefront, find matching products, explain choices, and guide you through tasks. It does not place orders for you.',
        'body_ar','المساعد يقدر يقرأ الصفحة الحالية، يلاقي المنتجات المناسبة، يشرح الاختيارات، ويوجّهك خطوة بخطوة. مش هيعمل الطلب بدل منك.',
        'primary_en','Open assistant',
        'primary_ar','افتح المساعد',
        'secondary_en','Next',
        'secondary_ar','التالي',
        'primary_action','open_ai',
        'secondary_action','next'
      ),
      jsonb_build_object(
        'id','guide',
        'badge_en','Guided Mode',
        'badge_ar','الوضع الإرشادي',
        'title_en','Guidance stays with you',
        'title_ar','الإرشاد بيفضل معاك',
        'body_en','When you ask to be guided, the assistant highlights the next control. You act yourself, then guidance continues from there.',
        'body_ar','لما تطلب الإرشاد، المساعد يحدد لك العنصر اللي بعده. أنت تنفّذ بنفسك، وبعدها الإرشاد يكمل من الخطوة التالية.',
        'primary_en','Next',
        'primary_ar','التالي',
        'secondary_en','Back',
        'secondary_ar','رجوع',
        'primary_action','next',
        'secondary_action','back'
      ),
      jsonb_build_object(
        'id','style',
        'badge_en','Make it comfortable',
        'badge_ar','خليه مناسب ليك',
        'title_en','Choose your experience',
        'title_ar','اختار شكل التجربة',
        'body_en','You can switch language, light or dark theme, and storefront experience any time. These choices stay with your account on this device.',
        'body_ar','تقدر تغيّر اللغة، الوضع الفاتح أو الداكن، وشكل المتجر في أي وقت. الاختيارات دي بتفضل محفوظة على الجهاز.',
        'primary_en','Choose experience',
        'primary_ar','اختار الشكل',
        'secondary_en','Finish',
        'secondary_ar','إنهاء',
        'primary_action','choose_experience',
        'secondary_action','finish'
      )
    )
  ),
  jsonb_build_object(
    'title_en','Welcome to ElDukkan',
    'title_ar','أهلاً بك في الدكان',
    'intro_en','A quick tour so you know where everything is. You stay in control while the assistant guides you.',
    'intro_ar','جولة سريعة تعرفك على المكان. أنت دائمًا المتحكم والمساعد يوجّهك فقط.',
    'steps', jsonb_build_array(
      jsonb_build_object(
        'id','welcome','badge_en','Welcome','badge_ar','أهلاً بك',
        'title_en','Your store, your way','title_ar','متجرك بطريقتك',
        'body_en','ElDukkan keeps shopping simple: search, compare, add to cart, then check out when you are ready.',
        'body_ar','الدكان بيخلّي التسوق بسيط: ابحث، قارن، ضيف للسلة، وبعدها كمّل الشراء وقت ما تكون جاهز.',
        'primary_en','Show me around','primary_ar','ورّيني المكان','secondary_en','Skip tour','secondary_ar','تخطي الجولة',
        'primary_action','next','secondary_action','skip'
      ),
      jsonb_build_object(
        'id','search','badge_en','Find anything','badge_ar','دوّر بسهولة',
        'title_en','Start with search','title_ar','ابدأ بالبحث',
        'body_en','Use the search box or ask the AI assistant to find products by name, category, budget, rating, or what you need.',
        'body_ar','استخدم البحث أو اطلب من المساعد يدوّر لك بالاسم أو الفئة أو الميزانية أو التقييم أو احتياجك.',
        'primary_en','Next','primary_ar','التالي','secondary_en','Back','secondary_ar','رجوع',
        'primary_action','next','secondary_action','back'
      ),
      jsonb_build_object(
        'id','ai','badge_en','Shopping assistant','badge_ar','مساعد التسوق',
        'title_en','Ask before you click','title_ar','اسأل قبل ما تدوس',
        'body_en','The assistant can read the current storefront, find matching products, explain choices, and guide you through tasks. It does not place orders for you.',
        'body_ar','المساعد يقدر يقرأ الصفحة الحالية، يلاقي المنتجات المناسبة، يشرح الاختيارات، ويوجّهك خطوة بخطوة. مش هيعمل الطلب بدل منك.',
        'primary_en','Open assistant','primary_ar','افتح المساعد','secondary_en','Next','secondary_ar','التالي',
        'primary_action','open_ai','secondary_action','next'
      ),
      jsonb_build_object(
        'id','guide','badge_en','Guided Mode','badge_ar','الوضع الإرشادي',
        'title_en','Guidance stays with you','title_ar','الإرشاد بيفضل معاك',
        'body_en','When you ask to be guided, the assistant highlights the next control. You act yourself, then guidance continues from there.',
        'body_ar','لما تطلب الإرشاد، المساعد يحدد لك العنصر اللي بعده. أنت تنفّذ بنفسك، وبعدها الإرشاد يكمل من الخطوة التالية.',
        'primary_en','Next','primary_ar','التالي','secondary_en','Back','secondary_ar','رجوع',
        'primary_action','next','secondary_action','back'
      ),
      jsonb_build_object(
        'id','style','badge_en','Make it comfortable','badge_ar','خليه مناسب ليك',
        'title_en','Choose your experience','title_ar','اختار شكل التجربة',
        'body_en','You can switch language, light or dark theme, and storefront experience any time. These choices stay with your account on this device.',
        'body_ar','تقدر تغيّر اللغة، الوضع الفاتح أو الداكن، وشكل المتجر في أي وقت. الاختيارات دي بتفضل محفوظة على الجهاز.',
        'primary_en','Choose experience','primary_ar','اختار الشكل','secondary_en','Finish','secondary_ar','إنهاء',
        'primary_action','choose_experience','secondary_action','finish'
      )
    )
  )
)
on conflict (id) do nothing;

alter table public.ai_onboarding_config enable row level security;
alter table public.ai_user_onboarding enable row level security;

drop policy if exists ai_onboarding_public_read on public.ai_onboarding_config;
create policy ai_onboarding_public_read on public.ai_onboarding_config
for select to anon, authenticated using (true);

drop policy if exists ai_onboarding_admin_manage on public.ai_onboarding_config;
create policy ai_onboarding_admin_manage on public.ai_onboarding_config
for all to authenticated
using (public.admin_has_permission('manage_ai'))
with check (public.admin_has_permission('manage_ai'));

drop policy if exists ai_user_onboarding_self_read on public.ai_user_onboarding;
create policy ai_user_onboarding_self_read on public.ai_user_onboarding
for select to authenticated using (user_id = auth.uid());

drop policy if exists ai_user_onboarding_self_insert on public.ai_user_onboarding;
create policy ai_user_onboarding_self_insert on public.ai_user_onboarding
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists ai_user_onboarding_self_update on public.ai_user_onboarding;
create policy ai_user_onboarding_self_update on public.ai_user_onboarding
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.ai_admin_update_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_enabled boolean := coalesce((p_settings->>'enabled')::boolean, true);
  v_guest_enabled boolean := coalesce((p_settings->>'guest_enabled')::boolean, true);
  v_unlimited boolean := coalesce((p_settings->>'unlimited')::boolean, false);
  v_renewal_credits integer := greatest(0, least(100000, coalesce((p_settings->>'renewal_credits')::integer, 100)));
  v_interval integer := greatest(5, least(43200, coalesce((p_settings->>'renewal_interval_minutes')::integer, 1440)));
  v_message_cost integer := greatest(0, least(1000, coalesce((p_settings->>'message_cost')::integer, 2)));
  v_search_cost integer := greatest(0, least(1000, coalesce((p_settings->>'search_cost')::integer, 0)));
  v_action_cost integer := greatest(0, least(1000, coalesce((p_settings->>'action_cost')::integer, 0)));
  v_max_balance integer := greatest(0, least(100000, coalesce((p_settings->>'max_balance')::integer, 100)));
  v_carry_over boolean := coalesce((p_settings->>'carry_over')::boolean, false);
  v_safe_mode boolean := coalesce((p_settings->>'safe_mode')::boolean, true);
  v_require_confirmation boolean := coalesce((p_settings->>'require_confirmation')::boolean, true);
  v_action_permissions jsonb := coalesce(p_settings->'action_permissions', '{}'::jsonb);
  v_admin uuid := auth.uid();
  v_row jsonb;
begin
  if not public.admin_has_permission('manage_ai') then
    raise exception 'AI management permission required';
  end if;

  if v_max_balance < v_renewal_credits and not v_unlimited then
    v_max_balance := v_renewal_credits;
  end if;

  v_action_permissions :=
    jsonb_build_object(
      'search_products', coalesce((v_action_permissions->>'search_products')::boolean, true),
      'add_to_cart', coalesce((v_action_permissions->>'add_to_cart')::boolean, true),
      'change_theme', coalesce((v_action_permissions->>'change_theme')::boolean, true),
      'apply_coupon', coalesce((v_action_permissions->>'apply_coupon')::boolean, true),
      'open_checkout', coalesce((v_action_permissions->>'open_checkout')::boolean, true),
      'start_guided_mode', coalesce((v_action_permissions->>'start_guided_mode')::boolean, true),
      'submit_order', false,
      'cancel_order', false
    );

  update public.ai_credit_settings
  set enabled=v_enabled,
      guest_enabled=v_guest_enabled,
      unlimited=v_unlimited,
      renewal_credits=v_renewal_credits,
      renewal_interval_minutes=v_interval,
      message_cost=v_message_cost,
      search_cost=v_search_cost,
      action_cost=v_action_cost,
      max_balance=v_max_balance,
      carry_over=v_carry_over,
      safe_mode=v_safe_mode,
      require_confirmation=v_require_confirmation,
      action_permissions=v_action_permissions,
      updated_by=v_admin,
      updated_at=now()
  where id=true;

  if not found then
    insert into public.ai_credit_settings(
      id,enabled,guest_enabled,unlimited,renewal_credits,renewal_interval_minutes,
      message_cost,search_cost,action_cost,max_balance,carry_over,safe_mode,
      require_confirmation,action_permissions,updated_by,updated_at
    ) values (
      true,v_enabled,v_guest_enabled,v_unlimited,v_renewal_credits,v_interval,
      v_message_cost,v_search_cost,v_action_cost,v_max_balance,v_carry_over,v_safe_mode,
      v_require_confirmation,v_action_permissions,v_admin,now()
    );
  end if;

  -- Make a shorter newly-configured interval take effect for existing wallets
  -- without pushing an already-sooner renewal further into the future.
  update public.ai_user_wallets
  set next_renewal_at=least(next_renewal_at, now()+make_interval(mins=>v_interval)),
      balance=least(balance,v_max_balance),
      updated_at=now()
  where not v_unlimited;

  update public.ai_guest_wallets
  set next_renewal_at=least(next_renewal_at, now()+make_interval(mins=>v_interval)),
      balance=least(balance,v_max_balance),
      updated_at=now()
  where not v_unlimited;

  select to_jsonb(s) into v_row from public.ai_credit_settings s where id=true;
  return v_row;
end;
$$;

revoke all on function public.ai_admin_update_settings(jsonb) from public, anon;
grant execute on function public.ai_admin_update_settings(jsonb) to authenticated, service_role;

create or replace function public.ai_admin_save_onboarding(p_draft jsonb, p_publish boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.ai_onboarding_config%rowtype;
  v_next_version integer;
begin
  if not public.admin_has_permission('manage_ai') then
    raise exception 'AI management permission required';
  end if;
  if jsonb_typeof(p_draft) <> 'object' then
    raise exception 'Onboarding content must be a JSON object';
  end if;
  if jsonb_typeof(coalesce(p_draft->'steps','null'::jsonb)) <> 'array' then
    raise exception 'Onboarding steps must be an array';
  end if;
  if jsonb_array_length(p_draft->'steps') < 1 or jsonb_array_length(p_draft->'steps') > 12 then
    raise exception 'Onboarding must contain between 1 and 12 steps';
  end if;

  select * into v_row from public.ai_onboarding_config where id=true for update;
  if not found then
    insert into public.ai_onboarding_config(id,draft_content,published_content,updated_by)
    values(true,p_draft,p_draft,auth.uid())
    returning * into v_row;
  else
    v_next_version := case when p_publish then v_row.published_version + 1 else v_row.published_version end;
    update public.ai_onboarding_config
    set draft_content=p_draft,
        draft_updated_at=now(),
        updated_by=auth.uid(),
        updated_at=now(),
        published_content=case when p_publish then p_draft else published_content end,
        published_version=v_next_version,
        published_at=case when p_publish then now() else published_at end
    where id=true
    returning * into v_row;
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.ai_admin_save_onboarding(jsonb,boolean) from public, anon;
grant execute on function public.ai_admin_save_onboarding(jsonb,boolean) to authenticated, service_role;

create or replace function public.ai_onboarding_complete(p_user_id uuid, p_version integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_version integer := greatest(0, p_version);
  v_row public.ai_user_onboarding%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  insert into public.ai_user_onboarding(user_id,completed_version,last_seen_version,completed_at,updated_at)
  values(p_user_id,v_version,v_version,now(),now())
  on conflict(user_id) do update set
    completed_version=greatest(public.ai_user_onboarding.completed_version,excluded.completed_version),
    last_seen_version=greatest(public.ai_user_onboarding.last_seen_version,excluded.last_seen_version),
    completed_at=case when excluded.completed_version >= public.ai_user_onboarding.completed_version then now() else public.ai_user_onboarding.completed_at end,
    updated_at=now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.ai_onboarding_complete(uuid,integer) from public, anon;
grant execute on function public.ai_onboarding_complete(uuid,integer) to authenticated;

