-- Household privacy policies.
-- Run this in the Supabase SQL Editor.
-- It keeps app/API access scoped to the households where the signed-in user is a member.

alter table public.household_members enable row level security;
alter table public.income_items enable row level security;
alter table public.categories enable row level security;
alter table public.budget_items enable row level security;
alter table public.loans enable row level security;

create or replace function public.is_household_member(target_household_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.user_id = auth.uid()
      and hm.household_key = target_household_key
  );
$$;

revoke all on function public.is_household_member(text) from public;
grant execute on function public.is_household_member(text) to authenticated;

create or replace function public.ensure_own_household_member(
  p_household_key text,
  p_household_name text default null,
  p_theme_preference text default 'kuro'
)
returns table (household_key text, theme_preference text)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_household_key text := nullif(trim(p_household_key), '');
  resolved_household_name text := nullif(trim(coalesce(p_household_name, p_household_key)), '');
  resolved_theme text := case
    when nullif(trim(p_theme_preference), '') = 'midnight' then 'kuro'
    else coalesce(nullif(trim(p_theme_preference), ''), 'kuro')
  end;
  household_key_column text := null;
  has_household_name boolean := false;
  has_theme_preference boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if resolved_household_key is null then
    raise exception 'Geen huishoudsleutel gevonden';
  end if;

  if to_regclass('public.households') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'households'
        and column_name = 'household_key'
    ) then
      household_key_column := 'household_key';
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'households'
        and column_name = 'id'
    ) then
      household_key_column := 'id';
    end if;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'households'
        and column_name = 'name'
    ) into has_household_name;

    if household_key_column is not null then
      if has_household_name then
        execute format(
          'insert into public.households (%I, name) values ($1, $2) on conflict do nothing',
          household_key_column
        )
        using resolved_household_key, coalesce(resolved_household_name, resolved_household_key);
      else
        execute format(
          'insert into public.households (%I) values ($1) on conflict do nothing',
          household_key_column
        )
        using resolved_household_key;
      end if;
    end if;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_members'
      and column_name = 'theme_preference'
  ) into has_theme_preference;

  if has_theme_preference then
    insert into public.household_members (user_id, household_key, theme_preference)
    values (auth.uid(), resolved_household_key, resolved_theme)
    on conflict do nothing;
  else
    insert into public.household_members (user_id, household_key)
    values (auth.uid(), resolved_household_key)
    on conflict do nothing;
  end if;

  return query
    select resolved_household_key, resolved_theme;
end;
$$;

revoke all on function public.ensure_own_household_member(text, text, text) from public;
grant execute on function public.ensure_own_household_member(text, text, text) to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_members'
      and column_name = 'theme_preference'
  ) then
    alter table public.household_members
      alter column theme_preference set default 'kuro';

    update public.household_members
    set theme_preference = 'kuro'
    where theme_preference = 'midnight';
  end if;
end $$;

do $$
declare
  household_identity_expression text;
begin
  if to_regclass('public.households') is null then
    return;
  end if;

  execute 'alter table public.households enable row level security';

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'household_key'
  ) then
    household_identity_expression := 'household_key';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'id'
  ) then
    household_identity_expression := 'id::text';
  else
    return;
  end if;

  execute 'drop policy if exists "Authenticated users can create households" on public.households';
  execute 'drop policy if exists "Household members can view households" on public.households';
  execute 'drop policy if exists "Household members can update households" on public.households';
  execute 'drop policy if exists "Household members can delete households" on public.households';

  execute 'create policy "Authenticated users can create households" on public.households for insert to authenticated with check (true)';

  execute format(
    'create policy "Household members can view households" on public.households for select to authenticated using (public.is_household_member(%s::text))',
    household_identity_expression
  );

  execute format(
    'create policy "Household members can update households" on public.households for update to authenticated using (public.is_household_member(%1$s::text)) with check (public.is_household_member(%1$s::text))',
    household_identity_expression
  );

  execute format(
    'create policy "Household members can delete households" on public.households for delete to authenticated using (public.is_household_member(%s::text))',
    household_identity_expression
  );

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'households'
      and column_name = 'name'
  ) then
    execute format(
      'insert into public.households (%1$s, name) select distinct hm.household_key, hm.household_key from public.household_members hm where not exists (select 1 from public.households h where h.%1$s::text = hm.household_key) on conflict do nothing',
      split_part(household_identity_expression, '::', 1)
    );
  else
    execute format(
      'insert into public.households (%1$s) select distinct hm.household_key from public.household_members hm where not exists (select 1 from public.households h where h.%1$s::text = hm.household_key) on conflict do nothing',
      split_part(household_identity_expression, '::', 1)
    );
  end if;
end $$;

drop policy if exists "Users can view their own household membership" on public.household_members;
drop policy if exists "Users can create their own household membership" on public.household_members;
drop policy if exists "Users can update their own household membership" on public.household_members;
drop policy if exists "Users can delete their own household membership" on public.household_members;

create policy "Users can view their own household membership"
on public.household_members
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can create their own household membership"
on public.household_members
for insert
to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can update their own household membership"
on public.household_members
for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can delete their own household membership"
on public.household_members
for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists "Household members can view income" on public.income_items;
drop policy if exists "Household members can create income" on public.income_items;
drop policy if exists "Household members can update income" on public.income_items;
drop policy if exists "Household members can delete income" on public.income_items;

create policy "Household members can view income"
on public.income_items
for select
to authenticated
using (public.is_household_member(household_key));

create policy "Household members can create income"
on public.income_items
for insert
to authenticated
with check (public.is_household_member(household_key));

create policy "Household members can update income"
on public.income_items
for update
to authenticated
using (public.is_household_member(household_key))
with check (public.is_household_member(household_key));

create policy "Household members can delete income"
on public.income_items
for delete
to authenticated
using (public.is_household_member(household_key));

drop policy if exists "Household members can view categories" on public.categories;
drop policy if exists "Household members can create categories" on public.categories;
drop policy if exists "Household members can update categories" on public.categories;
drop policy if exists "Household members can delete categories" on public.categories;

create policy "Household members can view categories"
on public.categories
for select
to authenticated
using (public.is_household_member(household_key));

create policy "Household members can create categories"
on public.categories
for insert
to authenticated
with check (public.is_household_member(household_key));

create policy "Household members can update categories"
on public.categories
for update
to authenticated
using (public.is_household_member(household_key))
with check (public.is_household_member(household_key));

create policy "Household members can delete categories"
on public.categories
for delete
to authenticated
using (public.is_household_member(household_key));

drop policy if exists "Household members can view budget items" on public.budget_items;
drop policy if exists "Household members can create budget items" on public.budget_items;
drop policy if exists "Household members can update budget items" on public.budget_items;
drop policy if exists "Household members can delete budget items" on public.budget_items;

create policy "Household members can view budget items"
on public.budget_items
for select
to authenticated
using (public.is_household_member(household_key));

create policy "Household members can create budget items"
on public.budget_items
for insert
to authenticated
with check (public.is_household_member(household_key));

create policy "Household members can update budget items"
on public.budget_items
for update
to authenticated
using (public.is_household_member(household_key))
with check (public.is_household_member(household_key));

create policy "Household members can delete budget items"
on public.budget_items
for delete
to authenticated
using (public.is_household_member(household_key));

drop policy if exists "Household members can view loans" on public.loans;
drop policy if exists "Household members can create loans" on public.loans;
drop policy if exists "Household members can update loans" on public.loans;
drop policy if exists "Household members can delete loans" on public.loans;

create policy "Household members can view loans"
on public.loans
for select
to authenticated
using (public.is_household_member(household_key));

create policy "Household members can create loans"
on public.loans
for insert
to authenticated
with check (public.is_household_member(household_key));

create policy "Household members can update loans"
on public.loans
for update
to authenticated
using (public.is_household_member(household_key))
with check (public.is_household_member(household_key));

create policy "Household members can delete loans"
on public.loans
for delete
to authenticated
using (public.is_household_member(household_key));
