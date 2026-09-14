-- ============================================================================
-- PATCH: tender_selesai_nilai — tambah kolom lokasi (CSV 2026)
-- ----------------------------------------------------------------------------
-- File sumber tender-selesai-nilai_2026.csv menambah 3 kolom baru dibanding
-- skema lama (14_tables_anggaran_dan_tender.sql): provinsi, lokasi_pekerjaan,
-- kabkota. Semua kolom lama tetap ada, tidak ada rename/hapus kolom.
--
-- Jalankan SEBELUM import ulang CSV tender-selesai-nilai_2026.csv, supaya
-- Supabase Table Editor bisa memetakan seluruh header CSV ke kolom yang ada
-- (kolom yang belum dikenal akan gagal/diabaikan saat import kalau tabel
-- belum diubah dulu).
-- ============================================================================

ALTER TABLE public.tender_selesai_nilai
  ADD COLUMN IF NOT EXISTS provinsi TEXT,
  ADD COLUMN IF NOT EXISTS lokasi_pekerjaan TEXT,
  ADD COLUMN IF NOT EXISTS kabkota TEXT;
