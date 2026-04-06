create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

create table if not exists public.subscriptions (
  user_id text primary key,
  plan text not null default 'free',
  status text not null default 'inactive',
  tracking_code text,
  is_owner boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  renewal_date timestamptz,
  grace_period_ends_at timestamptz,
  delete_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions add column if not exists renewal_date timestamptz;
alter table public.subscriptions add column if not exists grace_period_ends_at timestamptz;
alter table public.subscriptions add column if not exists delete_at timestamptz;
alter table public.subscriptions add column if not exists tracking_code text;
alter table public.subscriptions add column if not exists is_owner boolean not null default false;

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

create unique index if not exists subscriptions_tracking_code_unique_idx
  on public.subscriptions (tracking_code)
  where tracking_code is not null;

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  project_id uuid not null,
  format text not null,
  status text not null,
  engine text not null default 'ffmpeg-worker',
  command_preview text not null,
  output_url text,
  background_asset_id uuid,
  logo_asset_id uuid,
  audio_asset_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.export_jobs add column if not exists background_asset_id uuid;
alter table public.export_jobs add column if not exists logo_asset_id uuid;
alter table public.export_jobs add column if not exists audio_asset_id uuid;
alter table public.export_jobs add column if not exists error_message text;

create index if not exists export_jobs_user_created_at_idx
  on public.export_jobs (user_id, created_at desc);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null,
  file_name text not null,
  mime_type text not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists media_assets_user_created_at_idx
  on public.media_assets (user_id, created_at desc);
