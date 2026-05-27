create table if not exists public.app_records (
  id text primary key,
  entity text not null,
  record_id text not null,
  data jsonb not null,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create index if not exists app_records_entity_idx on public.app_records (entity);
create unique index if not exists app_records_entity_record_id_idx on public.app_records (entity, record_id);

alter table public.app_records enable row level security;

drop policy if exists "App records are readable" on public.app_records;
create policy "App records are readable"
on public.app_records for select
using (true);

drop policy if exists "App records can be inserted" on public.app_records;
create policy "App records can be inserted"
on public.app_records for insert
with check (true);

drop policy if exists "App records can be updated" on public.app_records;
create policy "App records can be updated"
on public.app_records for update
using (true)
with check (true);

drop policy if exists "App records can be deleted" on public.app_records;
create policy "App records can be deleted"
on public.app_records for delete
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_records'
  ) then
    alter publication supabase_realtime add table public.app_records;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Campaign assets are readable" on storage.objects;
create policy "Campaign assets are readable"
on storage.objects for select
using (bucket_id = 'campaign-assets');

drop policy if exists "Campaign assets can be uploaded" on storage.objects;
create policy "Campaign assets can be uploaded"
on storage.objects for insert
with check (bucket_id = 'campaign-assets');

drop policy if exists "Campaign assets can be updated" on storage.objects;
create policy "Campaign assets can be updated"
on storage.objects for update
using (bucket_id = 'campaign-assets')
with check (bucket_id = 'campaign-assets');

drop policy if exists "Campaign assets can be deleted" on storage.objects;
create policy "Campaign assets can be deleted"
on storage.objects for delete
using (bucket_id = 'campaign-assets');

with admin_campaign as (
  select
    record_id,
    data
  from public.app_records
  where entity = 'Campaign'
  order by
    case when lower(data->>'name') = 'sleepless nights' then 0 else 1 end,
    created_date
  limit 1
),
upsert_admin_campaign as (
  update public.app_records records
  set
    data = jsonb_set(records.data, '{dm_email}', '"ameliapaisleyspam123@gmail.com"', true),
    updated_date = now()
  from admin_campaign
  where records.entity = 'Campaign'
    and records.record_id = admin_campaign.record_id
  returning records.record_id
),
admin_user as (
  select
    coalesce((select record_id from public.app_records where entity = 'User' and lower(data->>'email') = 'ameliapaisleyspam123@gmail.com' limit 1), 'admin_ameliapaisleyspam123') as record_id,
    coalesce((select record_id from admin_campaign), '') as campaign_id
)
insert into public.app_records (id, entity, record_id, data, created_date, updated_date)
select
  'User:' || record_id,
  'User',
  record_id,
  jsonb_build_object(
    'id', record_id,
    'email', 'ameliapaisleyspam123@gmail.com',
    'full_name', 'Amelia',
    'display_name', 'Amelia',
    'campaign_id', campaign_id,
    'campaign_role', 'dm',
    'role', 'admin',
    'created_date', now(),
    'updated_date', now()
  ),
  now(),
  now()
from admin_user
on conflict (id) do update
set
  data = app_records.data
    || jsonb_build_object(
      'email', 'ameliapaisleyspam123@gmail.com',
      'campaign_id', excluded.data->>'campaign_id',
      'campaign_role', 'dm',
      'role', 'admin',
      'updated_date', now()
    ),
  updated_date = now();
