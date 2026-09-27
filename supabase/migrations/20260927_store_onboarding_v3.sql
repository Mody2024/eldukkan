-- Update 3: explicit customer shopping preferences and a new onboarding version.
-- Preferences are limited to shopping experience choices selected by the customer.

create table if not exists public.customer_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_categories text[] not null default '{}',
  budget_band text null check (budget_band in ('under_500','500_1500','1500_3000','3000_plus')),
  shopping_goal text null check (shopping_goal in ('specific','browse','compare')),
  assistant_mode text null check (assistant_mode in ('self','ask','guided')),
  language text null check (language in ('en','ar')),
  experience text null check (experience in ('modern','easy','heritage')),
  theme text null check (theme in ('light','dark')),
  onboarding_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_preferences enable row level security;

drop policy if exists customer_preferences_self_select on public.customer_preferences;
create policy customer_preferences_self_select on public.customer_preferences
for select to authenticated using (user_id = auth.uid());

drop policy if exists customer_preferences_self_insert on public.customer_preferences;
create policy customer_preferences_self_insert on public.customer_preferences
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists customer_preferences_self_update on public.customer_preferences;
create policy customer_preferences_self_update on public.customer_preferences
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists customer_preferences_categories_gin
  on public.customer_preferences using gin (preferred_categories);

-- Publish v3 without replacing any custom copy an admin may already have edited.
update public.ai_onboarding_config
set published_version = greatest(published_version, 3),
    updated_at = now()
where id = true;
