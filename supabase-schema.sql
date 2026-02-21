-- ============================================
-- SoloReels AI — Supabase Schema
-- Cole isso no SQL Editor do Supabase
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ──
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ── Brand Kits ──
create table if not exists public.brand_kits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  niche text not null,
  offer text not null,
  target_audience text not null,
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
  updated_at timestamptz default now()
);

alter table public.brand_kits enable row level security;
create policy "Users can view own brand_kits" on public.brand_kits for select using (auth.uid() = user_id);
create policy "Users can insert own brand_kits" on public.brand_kits for insert with check (auth.uid() = user_id);
create policy "Users can update own brand_kits" on public.brand_kits for update using (auth.uid() = user_id);
create policy "Users can delete own brand_kits" on public.brand_kits for delete using (auth.uid() = user_id);

-- ── Style Packs ──
create table if not exists public.style_packs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  rules text[] default '{}',
  example_phrases text[] default '{}',
  is_official boolean default false,
  created_at timestamptz default now()
);

alter table public.style_packs enable row level security;
create policy "Users can view own packs" on public.style_packs for select using (auth.uid() = user_id or is_official = true);
create policy "Users can insert own packs" on public.style_packs for insert with check (auth.uid() = user_id);
create policy "Users can update own packs" on public.style_packs for update using (auth.uid() = user_id);
create policy "Users can delete own packs" on public.style_packs for delete using (auth.uid() = user_id);

-- ── Scripts ──
create table if not exists public.scripts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  style_pack_id text not null,
  niche text not null,
  platform text not null default 'instagram',
  format text not null,
  objective text not null,
  input_summary text not null,
  result_json jsonb not null,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

alter table public.scripts enable row level security;
create policy "Users can view own scripts" on public.scripts for select using (auth.uid() = user_id);
create policy "Users can insert own scripts" on public.scripts for insert with check (auth.uid() = user_id);
create policy "Users can update own scripts" on public.scripts for update using (auth.uid() = user_id);
create policy "Users can delete own scripts" on public.scripts for delete using (auth.uid() = user_id);

-- ── Daily Usage ──
create table if not exists public.daily_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count integer not null default 0,
  created_at timestamptz default now(),
  unique (user_id, usage_date)
);

alter table public.daily_usage enable row level security;
create policy "Users can view own usage" on public.daily_usage for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on public.daily_usage for insert with check (auth.uid() = user_id);
create policy "Users can update own usage" on public.daily_usage for update using (auth.uid() = user_id);

-- ── Indexes ──
create index if not exists idx_brand_kits_user on public.brand_kits(user_id);
create index if not exists idx_scripts_user on public.scripts(user_id);
create index if not exists idx_scripts_user_fav on public.scripts(user_id, is_favorite);
create index if not exists idx_daily_usage_user_date on public.daily_usage(user_id, usage_date);
create index if not exists idx_style_packs_user on public.style_packs(user_id);

-- ── Storage bucket for uploads ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  true,
  10485760, -- 10MB
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated_images',
  'generated_images',
  true,
  10485760, -- 10MB
  array['image/png', 'image/jpeg', 'image/webp']
) on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload own assets"
  on storage.objects for insert
  with check (bucket_id = 'brand-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view brand assets"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

create policy "Users can delete own assets"
  on storage.objects for delete
  using (bucket_id = 'brand-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own assets"
  on storage.objects for update
  using (bucket_id = 'brand-assets' and auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for generated_images bucket
create policy "Anyone can view generated images"
  on storage.objects for select
  using (bucket_id = 'generated_images');

create policy "Users can upload own generated images"
  on storage.objects for insert
  with check (bucket_id = 'generated_images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own generated images"
  on storage.objects for delete
  using (bucket_id = 'generated_images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own generated images"
  on storage.objects for update
  using (bucket_id = 'generated_images' and auth.uid()::text = (storage.foldername(name))[1]);
