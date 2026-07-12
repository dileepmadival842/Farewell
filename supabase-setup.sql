create extension if not exists pgcrypto;

create table if not exists public.people (
    id uuid primary key default gen_random_uuid(),
    number integer not null unique check (number between 1 and 45),
    name text not null,
    role text,
    note text,
    color text default '#f1c40f',
    image_url text,
    created_at timestamptz not null default now()
);

create table if not exists public.wheel_state (
    id text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now()
);

create table if not exists public.spin_commands (
    id uuid primary key default gen_random_uuid(),
    source text,
    created_at timestamptz not null default now()
);

do $$
begin
    alter publication supabase_realtime add table public.wheel_state;
exception
    when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.spin_commands;
exception
    when duplicate_object then null;
end $$;

alter table public.people enable row level security;
alter table public.wheel_state enable row level security;
alter table public.spin_commands enable row level security;

drop policy if exists "Public can read people" on public.people;
create policy "Public can read people"
on public.people for select
using (true);

drop policy if exists "Public can add people" on public.people;
drop policy if exists "Admins can add people" on public.people;
create policy "Admins can add people"
on public.people for insert
to authenticated
with check (true);

drop policy if exists "Public can update people" on public.people;
drop policy if exists "Admins can update people" on public.people;
create policy "Admins can update people"
on public.people for update
to authenticated
using (true)
with check (true);

drop policy if exists "Public can delete people" on public.people;
drop policy if exists "Admins can delete people" on public.people;
create policy "Admins can delete people"
on public.people for delete
to authenticated
using (true);

drop policy if exists "Public can read wheel state" on public.wheel_state;
create policy "Public can read wheel state"
on public.wheel_state for select
using (true);

drop policy if exists "Public can write wheel state" on public.wheel_state;
create policy "Public can write wheel state"
on public.wheel_state for insert
with check (true);

drop policy if exists "Public can update wheel state" on public.wheel_state;
create policy "Public can update wheel state"
on public.wheel_state for update
using (true)
with check (true);

drop policy if exists "Public can delete wheel state" on public.wheel_state;
create policy "Public can delete wheel state"
on public.wheel_state for delete
using (true);

drop policy if exists "Public can read spin commands" on public.spin_commands;
create policy "Public can read spin commands"
on public.spin_commands for select
using (true);

drop policy if exists "Public can create spin commands" on public.spin_commands;
create policy "Public can create spin commands"
on public.spin_commands for insert
with check (true);

insert into storage.buckets (id, name, public)
values ('person-images', 'person-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read person images" on storage.objects;
create policy "Public can read person images"
on storage.objects for select
using (bucket_id = 'person-images');

drop policy if exists "Public can upload person images" on storage.objects;
drop policy if exists "Admins can upload person images" on storage.objects;
create policy "Admins can upload person images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'person-images');

drop policy if exists "Public can update person images" on storage.objects;
drop policy if exists "Admins can update person images" on storage.objects;
create policy "Admins can update person images"
on storage.objects for update
to authenticated
using (bucket_id = 'person-images')
with check (bucket_id = 'person-images');
