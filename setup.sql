-- התזרים שלנו: מסד הנתונים בענן.
-- רק שני מיילים יכולים להיכנס, וכל הנתונים סגורים לכל אחד אחר.
-- מריצים פעם אחת ב-Supabase: SQL Editor > מדביקים > Run. בטוח להריץ שוב.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 120),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  table_name text not null check (char_length(table_name) <= 60),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists records_ws_table on public.records (workspace_id, table_name);

-- 1. רק המיילים האלה יכולים לפתוח משתמש. כל מייל אחר נחסם כבר בכניסה.
create or replace function public.family_emails()
returns text[] language sql immutable as $$
  select array['0527117224p@gmail.com', '7145689b@gmail.com']::text[];
$$;

create or replace function public.only_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email, '')) <> all (public.family_emails()) then
    raise exception 'email not allowed';
  end if;
  return new;
end;
$$;
drop trigger if exists only_family on auth.users;
create trigger only_family before insert or update of email on auth.users
  for each row execute function public.only_family();

-- 2. התזרים המשותף, ושניכם בעלים שלו
insert into public.workspaces (id, name) values ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b', 'התזרים שלנו') on conflict (id) do nothing;
insert into public.members (workspace_id, email, role) values
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b', '0527117224p@gmail.com', 'owner'),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b', '7145689b@gmail.com', 'owner')
on conflict (workspace_id, email) do nothing;

-- 3. הקטגוריות, פעם אחת בלבד
insert into public.records (workspace_id, table_name, data)
select * from (values
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"סופר ומזון","type":"חובה","words":"שופרסל, רמי לוי, יוחננוף, ויקטורי, אושר עד, יש חסד, מחסני השוק, חצי חינם, מכולת, ירקות, פירות, סופר, מאפייה, קצביה, עוף"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"שכר דירה או משכנתא","type":"חובה","words":"שכר דירה, שכירות, משכנתא, משכנתה"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"חשמל, מים וארנונה","type":"חובה","words":"חשמל, חברת החשמל, מים, תאגיד, ארנונה, עירייה, גז, ועד בית"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"ילדים וחינוך","type":"חובה","words":"גן, צהרון, מעון, תלמוד תורה, ת\"ת, ישיבה, סמינר, שכר לימוד, חוג, בייביסיטר, חיתולים, טיטולים, מטרנה"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"רכב ותחבורה","type":"חובה","words":"דלק, פז, סונול, דור אלון, דלק, ten, חניה, פנגו, סלופארק, רב קו, אוטובוס, רכבת, מונית, גט, מוסך, טסט, צמיגים"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"ביטוחים ובריאות","type":"חובה","words":"ביטוח, הראל, מגדל, כלל, הפניקס, מנורה, מכבי, כללית, מאוחדת, לאומית, תרופות, סופר פארם, בית מרקחת, רופא, שיניים"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"תקשורת ומנויים","type":"רצון","words":"פלאפון, סלקום, פרטנר, גולן, הוט, בזק, yes, אינטרנט, נטפליקס, ספוטיפיי, גוגל, אפל, icloud, מנוי"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"שבת וחגים","type":"חובה","words":"שבת, חג, פסח, סוכות, ארבעת המינים, אתרוג, יין, חלות, נרות, מצות, משלוח מנות, פורים"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"ביגוד ובית","type":"רצון","words":"בגדים, נעליים, ביגוד, איקאה, ace, הום סנטר, כלי בית, רהיטים, מצעים, h&m, זארה, קסטרו, פוקס"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"מסעדות ובילויים","type":"רצון","words":"מסעדה, פיצה, שווארמה, פלאפל, המבורגר, קפה, קפה קפה, ארומה, וולט, wolt, תן ביס, 10ביס, בילוי, טיול, נופש, צימר, סרט, גלידה"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"צדקה ומעשרות","type":"חובה","words":"צדקה, מעשר, מעשרות, תרומה, קופת העיר, קופה, גמ\"ח, הוראת קבע צדקה"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"הלוואות וחובות","type":"חובה","words":"הלוואה, החזר הלוואה, ריבית, גמח, פריסה"}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"שונות","type":"רצון","words":""}'::jsonb),
  ('7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b'::uuid, 'cats', '{"name":"הכנסות","type":"הכנסה","words":"משכורת, שכר, הכנסה, קיבלתי, העברה מ, ביט מ, מענק, קצבה, קצבת ילדים, ביטוח לאומי, החזר מס, תשלום מלקוח"}'::jsonb)
) as v(w, t, d)
where not exists (select 1 from public.records where workspace_id = '7a1f3c2e-5b4d-4e8f-9a6b-1c2d3e4f5a6b' and table_name = 'cats');

-- 4. הרשאות: רק מי שמחובר וברשימת החברים רואה ועורך. כל השאר לא רואים כלום.
create or replace function public.my_role(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.members
  where workspace_id = ws and email = lower(auth.jwt() ->> 'email')
    and lower(auth.jwt() ->> 'email') = any (public.family_emails());
$$;
drop function if exists public.create_workspace(text);

alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.records enable row level security;
revoke all on public.workspaces, public.members, public.records from anon;
revoke execute on function public.my_role(uuid) from anon;

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

select 'מוכן' as status, (select count(*) from public.records where table_name = 'cats') as categories;
