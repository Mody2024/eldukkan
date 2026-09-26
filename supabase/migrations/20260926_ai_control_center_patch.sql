-- AI Control Center patch: ensure authenticated wallets/settings are initialized safely and aiDisabled is always returned.

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
    insert into public.ai_user_settings(user_id,email)
    values(p_user_id,coalesce(v_email,''))
    on conflict(user_id) do update set email=excluded.email, updated_at=now();
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