-- SoloReels AI — Supabase Schema (FINAL - SEM ERROS)
-- Copie TUDO e cole no SQL Editor do Supabase

-- 1. LIMPEZA (Opcional, mas recomendado para evitar conflitos)
drop table if exists style_packs cascade;
drop table if exists daily_usage cascade;
drop table if exists favorites cascade;
drop table if exists scripts cascade;
drop table if exists brand_kits cascade;

-- 2. TABELAS
create table brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  business_name text not null,
  niche text not null,
  offer text default '',
  target_audience text default '',
  city text default '',
  tone_adjectives text[] default '{}',
  forbidden_words text[] default '{}',
  differentiators text[] default '{}',
  proofs text[] default '{}',
  common_objections text[] default '{}',
  cta_preference text default '',
  color_palette text[] default '{}',
  logo_urls text[] default '{}',
  reference_image_urls text[] default '{}',
  reference_video_urls text[] default '{}',
  visual_style_description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create table scripts (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  brand_kit_id uuid references brand_kits(id) on delete set null,
  style_pack_id text not null,
  niche text not null,
  platform text default 'instagram',
  format text not null,
  objective text not null,
  input_summary text not null,
  result_json jsonb not null,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

create table daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  usage_date date not null default current_date,
  count int not null default 0,
  unique(user_id, usage_date)
);

create table style_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text default '',
  rules text[] default '{}',
  example_phrases text[] default '{}',
  is_official boolean default false,
  created_at timestamptz default now()
);

-- 3. STORAGE (Cria o bucket e as políticas via SQL)
-- Insere o bucket se não existir
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

-- Políticas de Storage (Permite tudo para usuários logados para simplificar o dev)
create policy "Public Access" on storage.objects for select using ( bucket_id = 'brand-assets' );
create policy "Authenticated Upload" on storage.objects for insert with check ( bucket_id = 'brand-assets' and auth.role() = 'authenticated' );
create policy "Authenticated Update" on storage.objects for update using ( bucket_id = 'brand-assets' and auth.role() = 'authenticated' );
create policy "Authenticated Delete" on storage.objects for delete using ( bucket_id = 'brand-assets' and auth.role() = 'authenticated' );

-- 4. RLS (Políticas das Tabelas)
alter table brand_kits enable row level security;
alter table scripts enable row level security;
alter table daily_usage enable row level security;
alter table style_packs enable row level security;

create policy "Users own brand_kits" on brand_kits for all using (auth.uid() = user_id);
create policy "Users own scripts" on scripts for all using (auth.uid() = user_id);
create policy "Users own daily_usage" on daily_usage for all using (auth.uid() = user_id);
create policy "Users own style_packs" on style_packs for all using (auth.uid() = user_id);

-- 5. PROFILES & SUBSCRIPTIONS
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  subscription_status text default 'free' check (subscription_status in ('free', 'basic', 'pro', 'enterprise')),
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can see their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);

-- Trigger para criar perfil automaticamente no signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, subscription_status)
  values (new.id, new.email, 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
