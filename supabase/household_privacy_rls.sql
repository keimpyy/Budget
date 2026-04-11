-- Household privacy policies.
-- Run this in the Supabase SQL Editor.
-- It keeps app/API access scoped to the households where the signed-in user is a member.

alter table public.household_members enable row level security;
alter table public.income_items enable row level security;
alter table public.categories enable row level security;
alter table public.budget_items enable row level security;
alter table public.loans enable row level security;

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
    'create policy "Household members can view households" on public.households for select to authenticated using (%s in (select hm.household_key from public.household_members hm where hm.user_id = (select auth.uid())))',
    household_identity_expression
  );

  execute format(
    'create policy "Household members can update households" on public.households for update to authenticated using (%1$s in (select hm.household_key from public.household_members hm where hm.user_id = (select auth.uid()))) with check (%1$s in (select hm.household_key from public.household_members hm where hm.user_id = (select auth.uid())))',
    household_identity_expression
  );

  execute format(
    'create policy "Household members can delete households" on public.households for delete to authenticated using (%s in (select hm.household_key from public.household_members hm where hm.user_id = (select auth.uid())))',
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
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can create income"
on public.income_items
for insert
to authenticated
with check (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can update income"
on public.income_items
for update
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
))
with check (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can delete income"
on public.income_items
for delete
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

drop policy if exists "Household members can view categories" on public.categories;
drop policy if exists "Household members can create categories" on public.categories;
drop policy if exists "Household members can update categories" on public.categories;
drop policy if exists "Household members can delete categories" on public.categories;

create policy "Household members can view categories"
on public.categories
for select
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can create categories"
on public.categories
for insert
to authenticated
with check (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can update categories"
on public.categories
for update
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
))
with check (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can delete categories"
on public.categories
for delete
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

drop policy if exists "Household members can view budget items" on public.budget_items;
drop policy if exists "Household members can create budget items" on public.budget_items;
drop policy if exists "Household members can update budget items" on public.budget_items;
drop policy if exists "Household members can delete budget items" on public.budget_items;

create policy "Household members can view budget items"
on public.budget_items
for select
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can create budget items"
on public.budget_items
for insert
to authenticated
with check (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can update budget items"
on public.budget_items
for update
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
))
with check (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can delete budget items"
on public.budget_items
for delete
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

drop policy if exists "Household members can view loans" on public.loans;
drop policy if exists "Household members can create loans" on public.loans;
drop policy if exists "Household members can update loans" on public.loans;
drop policy if exists "Household members can delete loans" on public.loans;

create policy "Household members can view loans"
on public.loans
for select
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can create loans"
on public.loans
for insert
to authenticated
with check (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can update loans"
on public.loans
for update
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
))
with check (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));

create policy "Household members can delete loans"
on public.loans
for delete
to authenticated
using (household_key in (
  select hm.household_key
  from public.household_members hm
  where hm.user_id = (select auth.uid())
));
