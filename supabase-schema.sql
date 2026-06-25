create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Money & Lucky',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.litter_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  record_date date not null,
  record_time time not null,
  boxes jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists litter_records_family_date_idx
  on public.litter_records (family_id, record_date desc, record_time desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_litter_records_updated_at on public.litter_records;
create trigger set_litter_records_updated_at
before update on public.litter_records
for each row execute function public.set_updated_at();

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.litter_records enable row level security;

drop policy if exists "families_select_members" on public.families;
create policy "families_select_members"
on public.families for select
using (
  exists (
    select 1 from public.family_members
    where family_members.family_id = families.id
      and family_members.user_id = auth.uid()
  )
);

drop policy if exists "families_insert_authenticated" on public.families;
create policy "families_insert_authenticated"
on public.families for insert
with check (owner_id = auth.uid());

drop policy if exists "families_update_owner" on public.families;
create policy "families_update_owner"
on public.families for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "family_members_select_self" on public.family_members;
create policy "family_members_select_self"
on public.family_members for select
using (user_id = auth.uid());

drop policy if exists "family_members_insert_self" on public.family_members;
create policy "family_members_insert_self"
on public.family_members for insert
with check (user_id = auth.uid());

drop policy if exists "litter_records_select_members" on public.litter_records;
create policy "litter_records_select_members"
on public.litter_records for select
using (
  exists (
    select 1 from public.family_members
    where family_members.family_id = litter_records.family_id
      and family_members.user_id = auth.uid()
  )
);

drop policy if exists "litter_records_insert_members" on public.litter_records;
create policy "litter_records_insert_members"
on public.litter_records for insert
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and exists (
    select 1 from public.family_members
    where family_members.family_id = litter_records.family_id
      and family_members.user_id = auth.uid()
  )
);

drop policy if exists "litter_records_update_members" on public.litter_records;
create policy "litter_records_update_members"
on public.litter_records for update
using (
  exists (
    select 1 from public.family_members
    where family_members.family_id = litter_records.family_id
      and family_members.user_id = auth.uid()
  )
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1 from public.family_members
    where family_members.family_id = litter_records.family_id
      and family_members.user_id = auth.uid()
  )
);

drop policy if exists "litter_records_delete_members" on public.litter_records;
create policy "litter_records_delete_members"
on public.litter_records for delete
using (
  exists (
    select 1 from public.family_members
    where family_members.family_id = litter_records.family_id
      and family_members.user_id = auth.uid()
  )
);
