-- ElDukkan AI Control Center
-- Credits, per-user overrides, memory, activity, safe controls.

create table if not exists public.ai_credit_settings (
  id boolean primary key default true check (id = true),
  enabled boolean not null default true,
  guest_enabled boolean not null default true,
  unlimited boolean not null default false,
  renewal_credits integer not null default 100 check (renewal_credits >= 0),
  renewal_interval_minutes integer not null default 1440 check (renewal_interval_minutes between 5 and 43200),
  message_cost integer not null default 2 check (message_cost >= 0),
  search_cost integer not null default 0 check (search_cost >= 0),
  action_cost integer not null default 0 check (action_cost >= 0),
  max_balance integer not null default 100 check (max_balance >= 0),
  carry_over boolean not null default false,
  safe_mode boolean not null default true,
  require_confirmation boolean not null default true,
  action_permissions jsonb not null default '{"search_products":true,"add_to_cart":true,"change_theme":true,"apply_coupon":true,"open_checkout":true,"start_guided_mode":true,"submit_order":false,"cancel_order":false}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);
insert into public.ai_credit_settings(id) values (true) on conflict (id) do nothing;

create table if not exists public.ai_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  daily_credits_override integer null check (daily_credits_override is null or daily_credits_override >= 0),
  message_cost_override integer null check (message_cost_override is null or message_cost_override >= 0),
  search_cost_override integer null check (search_cost_override is null or search_cost_override >= 0),
  action_cost_override integer null check (action_cost_override is null or action_cost_override >= 0),
  renewal_interval_minutes_override integer null check (renewal_interval_minutes_override is null or renewal_interval_minutes_override between 5 and 43200),
  max_balance_override integer null check (max_balance_override is null or max_balance_override >= 0),
  carry_over_override boolean null,
  unlimited_override boolean null,
  ai_disabled boolean not null default false,
  memory_enabled boolean not null default true,
  safe_mode_override boolean null,
  require_confirmation_override boolean null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ai_user_settings_email_lower_idx on public.ai_user_settings(lower(email));

create table if not exists public.ai_user_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  balance integer not null default 0 check (balance >= 0),
  next_renewal_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_guest_wallets (
  identifier text primary key,
  balance integer not null default 0 check (balance >= 0),
  next_renewal_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  user_id uuid null references auth.users(id) on delete set null,
  delta integer not null,
  balance_after integer not null,
  event_type text not null,
  reason text null,
  request_id text null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);
create unique index if not exists ai_credit_ledger_request_idx on public.ai_credit_ledger(identifier, request_id) where request_id is not null;
create index if not exists ai_credit_ledger_user_created_idx on public.ai_credit_ledger(user_id, created_at desc);

create table if not exists public.ai_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  preferences jsonb not null default '{}'::jsonb,
  recent_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  identifier text not null,
  event_type text not null,
  credits_charged integer not null default 0,
  success boolean not null default true,
  metadata jsonb null,
  created_at timestamptz not null default now()
);
create index if not exists ai_activity_user_created_idx on public.ai_activity_log(user_id, created_at desc);
create index if not exists ai_activity_created_idx on public.ai_activity_log(created_at desc);

alter table public.ai_credit_settings enable row level security;
alter table public.ai_user_settings enable row level security;
alter table public.ai_user_wallets enable row level security;
alter table public.ai_guest_wallets enable row level security;
alter table public.ai_credit_ledger enable row level security;
alter table public.ai_memory enable row level security;
alter table public.ai_activity_log enable row level security;

drop policy if exists ai_credit_settings_admin_manage on public.ai_credit_settings;
create policy ai_credit_settings_admin_manage on public.ai_credit_settings for all to authenticated
using (public.admin_has_permission('manage_ai'))
with check (public.admin_has_permission('manage_ai'));

drop policy if exists ai_user_settings_self_read on public.ai_user_settings;
create policy ai_user_settings_self_read on public.ai_user_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists ai_user_settings_admin_manage on public.ai_user_settings;
create policy ai_user_settings_admin_manage on public.ai_user_settings for all to authenticated
using (public.admin_has_permission('manage_ai'))
with check (public.admin_has_permission('manage_ai'));

drop policy if exists ai_user_wallets_self_read on public.ai_user_wallets;
create policy ai_user_wallets_self_read on public.ai_user_wallets for select to authenticated using (user_id = auth.uid());
drop policy if exists ai_user_wallets_admin_manage on public.ai_user_wallets;
create policy ai_user_wallets_admin_manage on public.ai_user_wallets for all to authenticated
using (public.admin_has_permission('manage_ai'))
with check (public.admin_has_permission('manage_ai'));

drop policy if exists ai_credit_ledger_self_read on public.ai_credit_ledger;
create policy ai_credit_ledger_self_read on public.ai_credit_ledger for select to authenticated using (user_id = auth.uid());
drop policy if exists ai_credit_ledger_admin_read on public.ai_credit_ledger;
create policy ai_credit_ledger_admin_read on public.ai_credit_ledger for select to authenticated using (public.admin_has_permission('manage_ai'));

drop policy if exists ai_memory_self_read on public.ai_memory;
create policy ai_memory_self_read on public.ai_memory for select to authenticated using (user_id = auth.uid());
drop policy if exists ai_memory_self_insert on public.ai_memory;
create policy ai_memory_self_insert on public.ai_memory for insert to authenticated with check (user_id = auth.uid());
drop policy if exists ai_memory_self_update on public.ai_memory;
create policy ai_memory_self_update on public.ai_memory for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists ai_memory_self_delete on public.ai_memory;
create policy ai_memory_self_delete on public.ai_memory for delete to authenticated using (user_id = auth.uid());

drop policy if exists ai_activity_self_read on public.ai_activity_log;
create policy ai_activity_self_read on public.ai_activity_log for select to authenticated using (user_id = auth.uid());
drop policy if exists ai_activity_admin_read on public.ai_activity_log;
create policy ai_activity_admin_read on public.ai_activity_log for select to authenticated using (public.admin_has_permission('manage_ai'));

create or replace function public.ai_sync_wallet(p_user_id uuid default null, p_identifier text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  cfg record; us record; wu public.ai_user_wallets%rowtype; wg public.ai_guest_wallets%rowtype;
  v_user boolean := p_user_id is not null; v_identifier text; v_email text;
  v_unlimited boolean; v_credits integer; v_interval integer; v_max integer; v_carry boolean;
  v_next timestamptz; v_balance integer; v_cycles integer; v_before integer; v_delta integer;
begin
  select * into cfg from public.ai_credit_settings where id = true;
  if not found then raise exception 'AI credit settings are missing'; end if;

  if v_user then
    v_identifier := 'user:' || p_user_id::text;
    select email into v_email from auth.users where id = p_user_id;
    select * into us from public.ai_user_settings where user_id = p_user_id;
    v_unlimited := coalesce(us.unlimited_override, cfg.unlimited);
    v_credits := coalesce(us.daily_credits_override, cfg.renewal_credits);
    v_interval := coalesce(us.renewal_interval_minutes_override, cfg.renewal_interval_minutes);
    v_max := coalesce(us.max_balance_override, cfg.max_balance);
    v_carry := coalesce(us.carry_over_override, cfg.carry_over);
    perform pg_advisory_xact_lock(hashtext(v_identifier));

    insert into public.ai_user_wallets(user_id,email,balance,next_renewal_at,last_seen_at,updated_at)
    values(p_user_id,coalesce(v_email,''),case when v_unlimited then 0 else least(v_credits,v_max) end,now()+make_interval(mins=>v_interval),now(),now())
    on conflict(user_id) do update set email=excluded.email,last_seen_at=now(),updated_at=now()
    returning * into wu;

    v_balance := wu.balance; v_next := wu.next_renewal_at;
    if not v_unlimited and v_next <= now() then
      v_cycles := greatest(1,floor(extract(epoch from(now()-v_next))/greatest(300,v_interval*60))::integer+1);
      v_before := v_balance;
      v_balance := case when v_carry then least(v_max,v_balance+(v_cycles*v_credits)) else least(v_max,v_credits) end;
      v_next := v_next + make_interval(mins=>v_cycles*v_interval);
      v_delta := v_balance-v_before;
      update public.ai_user_wallets set balance=v_balance,next_renewal_at=v_next,updated_at=now(),last_seen_at=now() where user_id=p_user_id;
      if v_delta <> 0 then
        insert into public.ai_credit_ledger(identifier,user_id,delta,balance_after,event_type,reason,metadata)
        values(v_identifier,p_user_id,v_delta,v_balance,'renewal','Automatic credit renewal',jsonb_build_object('cycles',v_cycles));
      end if;
    else
      update public.ai_user_wallets set last_seen_at=now(),updated_at=now() where user_id=p_user_id;
    end if;

    select balance,next_renewal_at into v_balance,v_next from public.ai_user_wallets where user_id=p_user_id;
  else
    if coalesce(p_identifier,'')='' then raise exception 'Guest identifier is required'; end if;
    v_identifier := p_identifier; v_unlimited := cfg.unlimited; v_credits := cfg.renewal_credits;
    v_interval := cfg.renewal_interval_minutes; v_max := cfg.max_balance; v_carry := cfg.carry_over;
    perform pg_advisory_xact_lock(hashtext(v_identifier));

    insert into public.ai_guest_wallets(identifier,balance,next_renewal_at,last_seen_at,updated_at)
    values(v_identifier,case when v_unlimited then 0 else least(v_credits,v_max) end,now()+make_interval(mins=>v_interval),now(),now())
    on conflict(identifier) do update set last_seen_at=now(),updated_at=now()
    returning * into wg;

    v_balance := wg.balance; v_next := wg.next_renewal_at;
    if not v_unlimited and v_next <= now() then
      v_cycles := greatest(1,floor(extract(epoch from(now()-v_next))/greatest(300,v_interval*60))::integer+1);
      v_before := v_balance;
      v_balance := case when v_carry then least(v_max,v_balance+(v_cycles*v_credits)) else least(v_max,v_credits) end;
      v_next := v_next + make_interval(mins=>v_cycles*v_interval);
      v_delta := v_balance-v_before;
      update public.ai_guest_wallets set balance=v_balance,next_renewal_at=v_next,updated_at=now() where identifier=v_identifier;
      if v_delta <> 0 then
        insert into public.ai_credit_ledger(identifier,user_id,delta,balance_after,event_type,reason,metadata)
        values(v_identifier,null,v_delta,v_balance,'renewal','Automatic guest credit renewal',jsonb_build_object('cycles',v_cycles));
      end if;
    end if;
    select balance,next_renewal_at into v_balance,v_next from public.ai_guest_wallets where identifier=v_identifier;
  end if;

  return jsonb_build_object(
    'enabled',cfg.enabled,'guestEnabled',cfg.guest_enabled,'unlimited',v_unlimited,'balance',greatest(0,coalesce(v_balance,0)),
    'nextRenewalAt',v_next,'renewalCredits',v_credits,'renewalIntervalMinutes',v_interval,
    'messageCost',case when v_user then coalesce(us.message_cost_override,cfg.message_cost) else cfg.message_cost end,
    'searchCost',case when v_user then coalesce(us.search_cost_override,cfg.search_cost) else cfg.search_cost end,
    'actionCost',case when v_user then coalesce(us.action_cost_override,cfg.action_cost) else cfg.action_cost end,
    'safeMode',case when v_user then coalesce(us.safe_mode_override,cfg.safe_mode) else cfg.safe_mode end,
    'requireConfirmation',case when v_user then coalesce(us.require_confirmation_override,cfg.require_confirmation) else cfg.require_confirmation end,
    'memoryEnabled',case when v_user then coalesce(us.memory_enabled,true) else false end,
    'aiDisabled',case when v_user then coalesce(us.ai_disabled,false) else false end,
    'actionPermissions',cfg.action_permissions
  );
end; $$;

create or replace function public.ai_consume_credits(
  p_user_id uuid,p_identifier text,p_cost integer,p_request_id text,p_event_type text default 'message',
  p_reason text default null,p_metadata jsonb default null
) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare status jsonb; v_identifier text; v_balance integer; v_unlimited boolean; v_exists record; v_user boolean := p_user_id is not null;
begin
  if p_cost < 0 then raise exception 'Credit cost cannot be negative'; end if;
  v_identifier := case when v_user then 'user:'||p_user_id::text else p_identifier end;
  if coalesce(v_identifier,'')='' then raise exception 'Identifier is required'; end if;
  perform pg_advisory_xact_lock(hashtext(v_identifier));
  if p_request_id is not null then
    select balance_after,delta into v_exists from public.ai_credit_ledger where identifier=v_identifier and request_id=p_request_id limit 1;
    if found then return jsonb_build_object('ok',true,'alreadyCharged',true,'balance',v_exists.balance_after,'unlimited',false); end if;
  end if;
  status := public.ai_sync_wallet(p_user_id,p_identifier);
  v_balance := coalesce((status->>'balance')::integer,0); v_unlimited := coalesce((status->>'unlimited')::boolean,false);
  if not v_unlimited and v_balance < p_cost then return status || jsonb_build_object('ok',false,'insufficientCredits',true); end if;
  if v_unlimited or p_cost=0 then
    insert into public.ai_credit_ledger(identifier,user_id,delta,balance_after,event_type,reason,request_id,metadata)
    values(v_identifier,p_user_id,0,v_balance,p_event_type,p_reason,p_request_id,p_metadata) on conflict do nothing;
    return status || jsonb_build_object('ok',true,'balance',v_balance);
  end if;
  if v_user then
    update public.ai_user_wallets set balance=balance-p_cost,last_seen_at=now(),updated_at=now() where user_id=p_user_id returning balance into v_balance;
  else
    update public.ai_guest_wallets set balance=balance-p_cost,last_seen_at=now(),updated_at=now() where identifier=p_identifier returning balance into v_balance;
  end if;
  insert into public.ai_credit_ledger(identifier,user_id,delta,balance_after,event_type,reason,request_id,metadata)
  values(v_identifier,p_user_id,-p_cost,v_balance,p_event_type,p_reason,p_request_id,p_metadata) on conflict do nothing;
  return status || jsonb_build_object('ok',true,'balance',v_balance,'charged',p_cost);
end; $$;

create or replace function public.ai_admin_adjust_credits(p_user_id uuid,p_delta integer,p_reason text default 'Admin credit adjustment')
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare w public.ai_user_wallets%rowtype; cfg record; v_max integer; v_new integer; v_before integer;
begin
  if not public.admin_has_permission('manage_ai') then raise exception 'AI management permission required'; end if;
  select * into cfg from public.ai_credit_settings where id=true;
  select * into w from public.ai_user_wallets where user_id=p_user_id for update;
  if not found then
    select email into w.email from auth.users where id=p_user_id;
    if w.email is null then raise exception 'User wallet not found'; end if;
    insert into public.ai_user_wallets(user_id,email,balance,next_renewal_at)
    values(p_user_id,w.email,least(coalesce(cfg.renewal_credits,100),coalesce(cfg.max_balance,100)),now()+make_interval(mins=>coalesce(cfg.renewal_interval_minutes,1440))) returning * into w;
  end if;
  if coalesce(cfg.unlimited,false) then return jsonb_build_object('ok',true,'unlimited',true,'balance',w.balance,'nextRenewalAt',w.next_renewal_at); end if;
  v_max := coalesce((select max_balance_override from public.ai_user_settings where user_id=p_user_id),cfg.max_balance);
  v_before := w.balance; v_new := greatest(0,least(v_max,v_before+p_delta));
  update public.ai_user_wallets set balance=v_new,updated_at=now() where user_id=p_user_id;
  insert into public.ai_credit_ledger(identifier,user_id,delta,balance_after,event_type,reason,metadata)
  values('user:'||p_user_id::text,p_user_id,v_new-v_before,v_new,'admin_adjustment',p_reason,jsonb_build_object('requested_delta',p_delta));
  return jsonb_build_object('ok',true,'unlimited',false,'balance',v_new,'nextRenewalAt',w.next_renewal_at);
end; $$;

revoke all on function public.ai_sync_wallet(uuid,text) from public,anon,authenticated;
revoke all on function public.ai_consume_credits(uuid,text,integer,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ai_sync_wallet(uuid,text) to service_role;
grant execute on function public.ai_consume_credits(uuid,text,integer,text,text,text,jsonb) to service_role;
revoke all on function public.ai_admin_adjust_credits(uuid,integer,text) from public,anon;
grant execute on function public.ai_admin_adjust_credits(uuid,integer,text) to authenticated,service_role;

update public.admin_users
set permissions = case when coalesce(permissions,'[]'::jsonb) ? 'manage_ai' then permissions else coalesce(permissions,'[]'::jsonb) || '["manage_ai"]'::jsonb end
where role='admin';
