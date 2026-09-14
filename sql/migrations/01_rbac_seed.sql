-- =============================================================================
-- DEWA-PBJ · RBAC — 002 SEED
-- Jalankan SETELAH 001_schema.sql, di Supabase SQL Editor.
-- Idempoten: akun yang emailnya sudah ada akan dilewati.
--
-- Membuat:
--   • 1 akun Administrator (UKPBJ)
--   • 1 akun Sekretariat Jenderal
--   • N akun PPK dummy — otomatis satu per nama_ppk unik pada data nyata
--
-- Password awal (silakan ganti di dashboard setelah login pertama):
--   admin@dewa-pbj.go.id     → AdminDewa#2026
--   sekjend@dewa-pbj.go.id   → SekjendDewa#2026
--   ppk.<slug>@dewa-pbj.go.id→ PpkDewa#2026
--
-- Trigger on_auth_user_created (dari 001) otomatis mengisi public.profiles
-- dari raw_user_meta_data, jadi tidak perlu insert profiles manual.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: buat user auth email+password lengkap dengan baris auth.identities.
-- Mengembalikan uuid user (baru atau yang sudah ada). Aman diulang.
-- -----------------------------------------------------------------------------
create or replace function public.seed_user(
  p_email    text,
  p_password text,
  p_meta     jsonb
)
returns uuid
language plpgsql
security definer
-- extensions: lokasi pgcrypto (crypt/gen_salt) di Supabase
set search_path = auth, public, extensions
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = lower(p_email);
  if v_id is not null then
    return v_id;  -- sudah ada, lewati
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id, 'authenticated', 'authenticated', lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    coalesce(p_meta, '{}'::jsonb),
    now(), now(),
    '', '', '', ''
  );

  -- Baris identitas email (kolom email di auth.identities bersifat generated,
  -- jadi tidak di-insert manual).
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now()
  );

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Administrator (UKPBJ)
-- -----------------------------------------------------------------------------
select public.seed_user(
  'admin@dewa-pbj.go.id',
  'AdminDewa#2026',
  jsonb_build_object('role','admin','full_name','Administrator UKPBJ')
);

-- -----------------------------------------------------------------------------
-- 2. Sekretariat Jenderal
-- -----------------------------------------------------------------------------
select public.seed_user(
  'sekjend@dewa-pbj.go.id',
  'SekjendDewa#2026',
  jsonb_build_object('role','sekjend','full_name','Sekretariat Jenderal')
);

-- -----------------------------------------------------------------------------
-- 3. PPK dummy — satu akun per nama_ppk unik di data.
--    Email: ppk.<slug>@dewa-pbj.go.id  (slug dari nama_ppk).
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  v_email text;
begin
  for r in
    select distinct nama_ppk, min(satker) as satker
    from public.view_dashboard_gabungan_satker
    where nama_ppk is not null and btrim(nama_ppk) <> ''
    group by nama_ppk
  loop
    v_email := 'ppk.' ||
      trim(both '.' from regexp_replace(lower(r.nama_ppk), '[^a-z0-9]+', '.', 'g')) ||
      '@dewa-pbj.go.id';

    perform public.seed_user(
      v_email,
      'PpkDewa#2026',
      jsonb_build_object(
        'role','ppk',
        'full_name', r.nama_ppk,
        'ppk_name',  r.nama_ppk,
        'satker',    r.satker
      )
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Verifikasi cepat (opsional): lihat ringkasan akun per role
-- -----------------------------------------------------------------------------
-- select role, count(*) from public.profiles group by role order by role;
-- select u.email, p.role, p.ppk_name
--   from public.profiles p join auth.users u on u.id = p.id
--   order by p.role, u.email;

-- Bersihkan helper seed bila tidak ingin menyimpannya:
-- drop function if exists public.seed_user(text, text, jsonb);
