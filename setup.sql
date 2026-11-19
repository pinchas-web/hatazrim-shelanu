-- מסד הנתונים של כל המערכות של קלוד לעצלנים.
-- אותו קובץ לכל מערכת: הנתונים נשמרים בטבלה אחת (records), והמבנה מגיע מ-blueprint.js.
-- מריצים פעם אחת בפרויקט Supabase: SQL Editor > מדביקים > Run.

-- העסק (סביבת עבודה) והגדרות המערכת
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 120),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- מי בצוות, ובאיזה תפקיד
create table if not exists public.members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);

-- כל הרשומות של כל הטבלאות
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  table_name text not null check (char_length(table_name) <= 60),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists records_ws_table on public.records (workspace_id, table_name);

-- טבלאות שלקוחות יכולים להוסיף אליהן בעצמם (טופס תורים, טופס הזמנה)
create table if not exists public.public_tables (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  table_name text not null,
  primary key (workspace_id, table_name)
);

-- עזרים
create or replace function public.my_role(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where workspace_id = ws and email = auth.jwt() ->> 'email';
$$;

create or replace function public.create_workspace(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.jwt() ->> 'email' is null then raise exception 'not signed in'; end if;
  insert into public.workspaces (name) values (left(p_name, 120)) returning id into new_id;
  insert into public.members (workspace_id, email, role) values (new_id, auth.jwt() ->> 'email', 'owner');
  return new_id;
end;
$$;

-- הרשאות
alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.records enable row level security;
alter table public.public_tables enable row level security;

drop policy if exists "members see their workspace" on public.workspaces;
create policy "members see their workspace" on public.workspaces
  for select to authenticated using (public.my_role(id) is not null);
drop policy if exists "owner edits workspace" on public.workspaces;
create policy "owner edits workspace" on public.workspaces
  for update to authenticated using (public.my_role(id) = 'owner') with check (public.my_role(id) = 'owner');

drop policy if exists "members see the team" on public.members;
create policy "members see the team" on public.members
  for select to authenticated using (public.my_role(workspace_id) is not null);
drop policy if exists "owner manages the team" on public.members;
create policy "owner manages the team" on public.members
  for all to authenticated using (public.my_role(workspace_id) = 'owner') with check (public.my_role(workspace_id) = 'owner');

drop policy if exists "team reads records" on public.records;
create policy "team reads records" on public.records
  for select to authenticated using (public.my_role(workspace_id) is not null);
drop policy if exists "team writes records" on public.records;
create policy "team writes records" on public.records
  for insert to authenticated with check (public.my_role(workspace_id) in ('owner', 'member'));
drop policy if exists "team updates records" on public.records;
create policy "team updates records" on public.records
  for update to authenticated using (public.my_role(workspace_id) in ('owner', 'member')) with check (public.my_role(workspace_id) in ('owner', 'member'));
drop policy if exists "team deletes records" on public.records;
create policy "team deletes records" on public.records
  for delete to authenticated using (public.my_role(workspace_id) in ('owner', 'member'));

drop policy if exists "public forms insert" on public.records;
create policy "public forms insert" on public.records
  for insert to anon with check (
    exists (select 1 from public.public_tables p where p.workspace_id = records.workspace_id and p.table_name = records.table_name)
  );

drop policy if exists "team manages public tables" on public.public_tables;
create policy "team manages public tables" on public.public_tables
  for all to authenticated using (public.my_role(workspace_id) = 'owner') with check (public.my_role(workspace_id) = 'owner');

-- תמונות שמצלמים במערכת
insert into storage.buckets (id, name, public) values ('app-files', 'app-files', true) on conflict (id) do nothing;
drop policy if exists "app files public read" on storage.objects;
create policy "app files public read" on storage.objects for select using (bucket_id = 'app-files');
drop policy if exists "team uploads app files" on storage.objects;
create policy "team uploads app files" on storage.objects for insert to authenticated
  with check (bucket_id = 'app-files' and public.my_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member'));
