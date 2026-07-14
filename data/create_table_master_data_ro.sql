-- ==============================================================================
-- Script Pembuatan Tabel master_data_ro
-- Sumber file: data/Master Data RO (1).csv (Delimiter Titik Koma / Semicolon)
-- ==============================================================================

-- 1. Hapus tabel jika sudah ada
DROP TABLE IF EXISTS public.master_data_ro CASCADE;

-- 2. Pembuatan struktur tabel (Menggunakan nama persis sesuai Header CSV agar Auto-Match di Supabase)
CREATE TABLE public.master_data_ro (
    id SERIAL PRIMARY KEY,
    "No" TEXT,
    "Kode/ID paket" BIGINT,
    "Nama paket" TEXT,
    "Jenis Pengadaan (barang/jasa/konstruksi/lainnya)" TEXT,
    "Nilai Paket (Rp)" TEXT, -- Diatur sebagai TEXT karena datanya mengandung koma (misal: 32,500,000,000)
    "Lokasi" TEXT,
    "Waktu pengadaan (bulan/triwulan)" TEXT,
    "Skema (tender/e-purchasing/katalog/lainnya)" TEXT,
    "Kendala" TEXT,
    "Mitigasi" TEXT,
    "RO" TEXT,
    "REALISASI" TEXT
);

-- 3. Beri indeks pada kolom kode_id_paket untuk mempercepat pencarian/join jika diperlukan
CREATE INDEX idx_master_data_ro_kode_paket ON public.master_data_ro ("Kode/ID paket");

-- 4. Set RLS (Row Level Security) agar tabel bisa diakses jika diperlukan
ALTER TABLE public.master_data_ro ENABLE ROW LEVEL SECURITY;

-- 5. Buat kebijakan (policy) agar bisa dibaca secara publik/anon
CREATE POLICY "Allow public read access on master_data_ro"
ON public.master_data_ro
FOR SELECT
TO public
USING (true);

-- ==============================================================================
-- TIPS IMPORT DI SUPABASE:
-- ==============================================================================
-- 1. Karena format CSV Anda menggunakan tanda titik koma (;), saat mengunggah di Supabase,
--    pastikan Anda mengganti bagian delimiter/pemisah dari Comma (,) menjadi Semicolon (;).
-- 2. Supabase akan secara otomatis membaca Header dan mencocokkannya ke tabel ini
--    tanpa error, karena kolom angka sudah diset sebagai TEXT untuk sementara waktu.
