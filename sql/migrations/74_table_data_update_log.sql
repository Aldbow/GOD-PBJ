-- ============================================================================
-- TABEL BARU: data_update_log — jejak kapan tiap tabel terakhir di-update
-- ----------------------------------------------------------------------------
-- TUJUAN
--   Topbar aplikasi menampilkan "Diperbarui N jam lalu". Angka itu harus jujur:
--   yang dimaksud adalah kapan ISI TABEL SUPABASE benar-benar ditulis ulang,
--   bukan kapan file di data/data_update/ ditarik dari API dan bukan kapan
--   repo di-deploy.
--
-- KENAPA TABEL, BUKAN BACA data/data_update/<tabel>/*.meta.json
--   1. meta.json mencatat waktu TARIK API. Antara tarik dan tulis-ke-DB bisa
--      berjarak berhari-hari (file ditarik, baru kemudian scriptnya dijalankan),
--      dan file bisa saja tidak pernah jadi ditulis sama sekali karena gagal
--      pemeriksaan DROP_GUARD.
--   2. File hanya sampai ke production lewat commit + deploy. Update yang
--      dijalankan dari komputer lain tanpa deploy ulang tidak akan terlihat.
--   Tabel ini ditulis oleh scripts/update_from_data_update.mjs tepat setelah
--   tulis-ke-DB berhasil, jadi selalu sinkron dengan isi database.
--
-- SIAPA YANG MENGISI
--   scripts/update_from_data_update.mjs — satu baris per tabel per kali jalan,
--   HANYA untuk tabel yang benar-benar berhasil ditulis. --dry-run tidak
--   pernah menulis ke sini. Tabel yang tertahan DROP_GUARD atau gagal validasi
--   juga tidak dicatat — jadi tidak ada baris palsu yang membuat dashboard
--   terlihat segar padahal datanya tidak berubah.
--
-- TABEL INI TIDAK IKUT DIHAPUS oleh mekanisme update mana pun; namanya tidak
-- ada di konstanta TABLES, dan tidak ada folder data/data_update/data_update_log.
--
-- Jalankan di Supabase SQL Editor SEBELUM memakai script updater versi baru.
-- Sesudah dijalankan, segarkan tipe TypeScript:
--   npx supabase gen types typescript --project-id bsskoapfeejutazpsyvd --schema public > database.types.ts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.data_update_log (
    id BIGSERIAL PRIMARY KEY,

    -- nama tabel yang di-update (sama persis dgn cfg.table di script)
    table_name TEXT NOT NULL,

    -- 'upsert' | 'replace' — mode yang dipakai saat itu
    mode TEXT,

    -- jumlah baris SEBELUM dan SESUDAH ditulis; selisihnya langsung terbaca
    rows_before INTEGER,
    rows_after INTEGER,

    -- file sumber relatif thd root repo, mis.
    -- 'data/data_update/paket_e_purchasing/paket-e-purchasing_2026.json'
    source_file TEXT,

    -- 'lastUpdated' dari *.meta.json pasangan file di atas: kapan data itu
    -- DITARIK dari API. Disimpan sebagai pembanding — selisihnya dengan
    -- finished_at = berapa lama file mengendap sebelum masuk DB.
    source_pulled_at TIMESTAMP WITH TIME ZONE,

    -- kapan tulis-ke-DB selesai. INI yang dibaca topbar.
    finished_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Query utama topbar: ORDER BY finished_at DESC LIMIT 1. DESC agar index
-- langsung dipakai tanpa sort.
CREATE INDEX IF NOT EXISTS idx_data_update_log_finished_at
    ON public.data_update_log (finished_at DESC);

-- Untuk melihat riwayat satu tabel tertentu (mis. "kapan e-purchasing terakhir?")
CREATE INDEX IF NOT EXISTS idx_data_update_log_table_finished
    ON public.data_update_log (table_name, finished_at DESC);

-- ----------------------------------------------------------------------------
-- RLS — mengikuti pola migration 72.
-- Script updater menulis memakai ANON key kalau SUPABASE_SERVICE_ROLE_KEY tidak
-- diisi (lihat docs/RUNBOOK-UPDATE-DATA.md bagian 2). Tanpa policy tulis,
-- pencatatan log akan gagal dengan galat 42501.
--
-- Untuk mengetatkan nanti: isi SUPABASE_SERVICE_ROLE_KEY di .env.local, lalu
--   DROP POLICY "Allow anon write for importer" ON public.data_update_log;
-- ----------------------------------------------------------------------------
ALTER TABLE public.data_update_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
ON public.data_update_log
FOR SELECT
USING (true);

CREATE POLICY "Allow anon write for importer"
ON public.data_update_log
FOR ALL
USING (true)
WITH CHECK (true);
