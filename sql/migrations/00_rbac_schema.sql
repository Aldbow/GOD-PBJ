-- =============================================================================
-- DEWA-PBJ · RBAC — 001 SCHEMA
-- Jalankan di Supabase SQL Editor (satu kali). Idempoten: aman diulang.
--
-- Membuat:
--   1. Enum public.app_role  (admin | sekjend | ppk)
--   2. Tabel public.profiles (1:1 dengan auth.users)
--   3. Trigger auto-provision profil saat user auth dibuat
--   4. Helper public.is_admin() (SECURITY DEFINER, anti-rekursi RLS)
--   5. Row Level Security pada public.profiles
--
-- Model role:
--   admin   (UKPBJ)               → superadmin, akses penuh
--   sekjend (Sekretariat Jenderal)→ read-only, hanya Ringkasan
--   ppk     (PPK)                 → read-only, hanya paket miliknya (by ppk_name)
-- =============================================================================

-- Ekstensi untuk hashing password di seed (crypt / gen_salt / gen_random_uuid)
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Enum role aplikasi
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'sekjend', 'ppk');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Tabel profiles
--    ppk_name = foreign-key logis (string) ke kolom nama_ppk pada
--    view_dashboard_gabungan_satker — dipakai untuk scoping data PPK.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       public.app_role not null default 'ppk',
  ppk_name   text,            -- WAJIB untuk role 'ppk' (lihat constraint)
  eselon1    text,            -- konteks scope (opsional)
  satker     text,            -- konteks scope (opsional)
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ppk_needs_scope check (role <> 'ppk' or ppk_name is not null)
);

create index if not exists profiles_role_idx     on public.profiles(role);
create index if not exists profiles_ppk_name_idx on public.profiles(ppk_name);

comment on table  public.profiles is 'Profil & otorisasi aplikasi, 1:1 dengan auth.users.';
comment on column public.profiles.ppk_name is 'Cocok dengan nama_ppk di view_dashboard_gabungan_satker; scope data untuk role ppk.';

-- -----------------------------------------------------------------------------
-- 3. Auto-provision profil dari auth.users
--    Metadata role/full_name/ppk_name diambil dari raw_user_meta_data.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, ppk_name, eselon1, satker)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'ppk'),
    new.raw_user_meta_data->>'ppk_name',
    new.raw_user_meta_data->>'eselon1',
    new.raw_user_meta_data->>'satker'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. Helper is_admin() — SECURITY DEFINER agar tidak memicu rekursi RLS
--    ketika policy profiles perlu mengecek apakah pemanggil seorang admin.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self  on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_admin_write  on public.profiles;

-- Setiap user boleh membaca profilnya sendiri
create policy profiles_select_self on public.profiles
  for select using (auth.uid() = id);

-- Admin boleh membaca semua profil (kelola akun)
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

-- Hanya admin yang boleh insert/update/delete profil
create policy profiles_admin_write on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- FASE LANJUTAN (TIDAK DIJALANKAN SEKARANG) — RLS data-level penuh
-- -----------------------------------------------------------------------------
-- Saat ini data pengadaan dibaca via view_dashboard_gabungan_satker dengan
-- anon key, dan scoping PPK ditegakkan di layer aplikasi (query .eq('nama_ppk')).
-- Untuk defense-in-depth di DB pada fase berikutnya:
--   1. alter view ... set (security_invoker = true);
--   2. wajibkan pembacaan sebagai role authenticated (cabut grant anon);
--   3. RLS pada tabel sumber yang memetakan auth.uid() -> profiles.ppk_name
--      = kolom nama_ppk. Contoh predikat:
--        using (
--          public.is_admin()
--          or exists (select 1 from public.profiles p
--                     where p.id = auth.uid()
--                       and (p.role = 'sekjend'
--                            or p.ppk_name = <tabel>.nama_ppk))
--        )
-- =============================================================================
