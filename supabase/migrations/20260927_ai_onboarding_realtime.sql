-- Keep published onboarding changes live without requiring a hard refresh.
do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'ai_onboarding_config'
  ) then
    alter publication supabase_realtime add table public.ai_onboarding_config;
  end if;
end $$;
