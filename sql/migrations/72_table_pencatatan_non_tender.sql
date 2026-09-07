-- ============================================================================
-- TABEL BARU: pencatatan_non_tender — level PAKET (bukan realisasi)
-- ----------------------------------------------------------------------------
-- Sumber: endpoint /v1/tender/pencatatan-non-tender
--         data/data_update/pencatatan_non_tender/pencatatan-non-tender_2026.json
--
-- KENAPA TABEL BARU, BUKAN MENGGANTI pencatatan_non_tender_realisasi
--   Keduanya beda granularitas dan saling melengkapi:
--     - pencatatan_non_tender_realisasi = 1 baris per INPUT REALISASI (130 baris)
--       -> nilai_realisasi, no_realisasi, tgl_realisasi, nama_penyedia
--     - pencatatan_non_tender (tabel ini) = 1 baris per PAKET (65 baris)
--       -> status paket, alasan pembatalan, metode, kategori, uraian pekerjaan
--   Tabel realisasi TIDAK punya kolom status paket, dan tabel ini TIDAK punya
--   kolom penyedia/tanggal/nomor realisasi. Mengganti salah satunya dengan yang
--   lain akan merusak view_dashboard_pengadaan_langsung (butuh nama_penyedia)
--   dan endpoint recalculate risiko (butuh tgl_realisasi + no_realisasi).
--
-- RELASI
--   pencatatan_non_tender.kd_nontender_pct  1 --- N  pencatatan_non_tender_realisasi.kd_nontender_pct
--   Terverifikasi pada data 2026: kd_nontender_pct unik 65/65 di file paket,
--   terisi 130/130 di tabel realisasi, 0 baris realisasi yatim.
--   JANGAN join lewat kd_rup — hanya unik 55 dari 65 paket (satu RUP bisa
--   dipecah jadi beberapa paket pencatatan), join lewat kd_rup akan fan-out.
--
-- TIPE DATA
--   Semua TEXT, mengikuti pola tabel sejenis (lihat migration 11-14 dan
--   catatan di 68_alter_pencatatan_non_tender_hps.sql). Kolom angka seperti
--   pagu / total_realisasi / hps ikut TEXT walau isinya angka — konsumen wajib
--   cast (::numeric) seperti yang sudah dilakukan view_dashboard_* .
--
-- Jalankan di Supabase SQL Editor SEBELUM:
--   node scripts/update_from_data_update.mjs --dry-run --table pencatatan_non_tender
-- Sesudah dijalankan, segarkan tipe TypeScript:
--   npx supabase gen types typescript --project-id bsskoapfeejutazpsyvd --schema public > database.types.ts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pencatatan_non_tender (
    -- kunci alami dari sumber; dipakai sbg PK agar upsert (onConflict) bisa jalan
    kd_nontender_pct TEXT PRIMARY KEY,

    -- identitas paket
    kd_rup TEXT,
    kd_pkt_dce TEXT,
    nama_paket TEXT,
    uraian_pekerjaan TEXT,
    informasi_lainnya TEXT,

    -- klasifikasi
    mtd_pemilihan TEXT,
    kategori_pengadaan TEXT,
    sumber_dana TEXT,
    bukti_pembayaran TEXT,

    -- status paket (tidak ada padanannya di pencatatan_non_tender_realisasi)
    status_nontender_pct TEXT,
    status_nontender_pct_ket TEXT,
    alasan_pembatalan TEXT,

    -- nilai (TEXT, cast di konsumen)
    pagu TEXT,
    hps TEXT,
    total_realisasi TEXT,
    nilai_pdn_pct TEXT,
    nilai_umk_pct TEXT,

    -- satker & PPK
    kd_satker TEXT,
    kd_satker_str TEXT,
    nama_satker TEXT,
    nama_ppk TEXT,
    nip_ppk TEXT,

    -- KLPD & LPSE
    kd_klpd TEXT,
    nama_klpd TEXT,
    jenis_klpd TEXT,
    kd_lpse TEXT,

    -- tanggal (TEXT, format ISO dari sumber)
    tgl_buat_paket TEXT,
    tgl_mulai_paket TEXT,
    tgl_selesai_paket TEXT,

    tahun_anggaran TEXT,
    last_update_ref TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Join ke tabel realisasi & ke view dashboard lewat kd_rup
CREATE INDEX IF NOT EXISTS idx_pencatatan_non_tender_kd_rup
    ON public.pencatatan_non_tender (kd_rup);

-- Filter "buang Paket Dibatalkan" yang dipakai saat agregasi
CREATE INDEX IF NOT EXISTS idx_pencatatan_non_tender_status
    ON public.pencatatan_non_tender (status_nontender_pct_ket);

-- ----------------------------------------------------------------------------
-- RLS
-- Perhatian: JANGAN aktifkan RLS hanya dengan policy SELECT seperti migration 12.
-- scripts/update_from_data_update.mjs menulis memakai ANON key (service role key
-- opsional, lihat runbook bagian 2) — tabel yang read-only untuk anon akan
-- menggagalkan import dengan galat 42501. Policy tulis di bawah menyamakan tabel
-- ini dengan kondisi de-facto tabel sejenis di database live.
--
-- Untuk mengetatkan nanti: isi SUPABASE_SERVICE_ROLE_KEY di .env.local, lalu
--   DROP POLICY "Allow anon write for importer" ON public.pencatatan_non_tender;
-- ----------------------------------------------------------------------------
ALTER TABLE public.pencatatan_non_tender ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
ON public.pencatatan_non_tender
FOR SELECT
USING (true);

CREATE POLICY "Allow anon write for importer"
ON public.pencatatan_non_tender
FOR ALL
USING (true)
WITH CHECK (true);
