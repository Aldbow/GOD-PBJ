-- File: sql/add_ai_curation_columns.sql

-- 1. Tambahkan kolom ke tabel penyedia
ALTER TABLE api_paket_penyedia_terumumkan
ADD COLUMN IF NOT EXISTS status_kurasi VARCHAR(50) DEFAULT 'Belum Dikurasi',
ADD COLUMN IF NOT EXISTS catatan_kurasi TEXT,
ADD COLUMN IF NOT EXISTS rekomendasi_kurasi TEXT;

-- 2. Tambahkan kolom ke tabel swakelola
ALTER TABLE api_paket_swakelola_terumumkan
ADD COLUMN IF NOT EXISTS status_kurasi VARCHAR(50) DEFAULT 'Belum Dikurasi',
ADD COLUMN IF NOT EXISTS catatan_kurasi TEXT,
ADD COLUMN IF NOT EXISTS rekomendasi_kurasi TEXT;

-- CATATAN PENTING: 
-- Anda perlu memperbarui definisi VIEW yang Anda miliki
-- (seperti view_dashboard_pengadaan_langsung) 
-- untuk menyertakan `pl.status_kurasi`, `pl.catatan_kurasi`, dan `pl.rekomendasi_kurasi`
-- di bagian `SELECT ...`.
