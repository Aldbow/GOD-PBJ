-- ============================================================================
-- PATCH: master_data_ro — lengkapi kolom sesuai master_data_ro_rows (1).csv
-- ----------------------------------------------------------------------------
-- Tabel master_data_ro yang ada sekarang cuma punya: id, no, kd_rup, nama_paket,
-- nama_ro, nilai_paket, skema, created_at. File sumber terbaru
-- (data/csv/master_data_ro_rows (1).csv) punya 6 kolom tambahan yang belum
-- ada di tabel ini. Jalankan SEBELUM import ulang CSV-nya.
--
-- Catatan header CSV yang TIDAK sama persis dengan nama kolom (perlu dipetakan
-- manual saat import lewat Supabase Table Editor, bukan auto-match nama):
--   "Kode/ID paket"                          -> kd_rup   (sudah ada)
--   "RO"                                     -> nama_ro  (sudah ada)
--   "Jenis Pengadaan (barang/jasa/..."       -> jenis_pengadaan (baru)
--   "Lokasi"                                 -> lokasi (baru)
--   "Waktu pengadaan (bulan/triwulan)"       -> waktu_pengadaan (baru)
--   "Kendala"                                -> kendala (baru)
--   "Mitigasi"                               -> mitigasi (baru)
--   "REALISASI"                              -> realisasi (baru)
--
-- PENTING soal kolom "id" di CSV: nilainya angka biasa (251, 252, ...), bukan
-- UUID. JANGAN dipetakan ke kolom id tabel (default-nya generate UUID sendiri)
-- — biarkan kolom id di-skip saat import, dan simpan angka itu di kolom "no"
-- yang sudah ada (memang itu fungsinya).
-- ============================================================================

ALTER TABLE public.master_data_ro
  ADD COLUMN IF NOT EXISTS jenis_pengadaan TEXT,
  ADD COLUMN IF NOT EXISTS lokasi TEXT,
  ADD COLUMN IF NOT EXISTS waktu_pengadaan TEXT,
  ADD COLUMN IF NOT EXISTS kendala TEXT,
  ADD COLUMN IF NOT EXISTS mitigasi TEXT,
  ADD COLUMN IF NOT EXISTS realisasi TEXT;
