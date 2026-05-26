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
