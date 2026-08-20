-- ============================================================================
-- PATCH: pencatatan_non_tender_realisasi — tambah kolom hps
-- ----------------------------------------------------------------------------
-- File sumber pencatatan-non-tender-realisasi_2026.json (endpoint
-- /v1/tender/pencatatan-non-tender-realisasi) mengirim field `hps` yang
-- belum punya kolom di tabel. Tanpa kolom ini PostgREST menolak seluruh
-- batch dengan PGRST204 ("column ... does not exist").
--
-- TEXT dipilih agar konsisten dengan kolom sejenis di tabel yang sama
-- (pagu, nilai_realisasi) yang juga TEXT walau isinya angka.
--
-- Semua kolom lama tetap ada, tidak ada rename/hapus kolom. Baris lama akan
-- bernilai NULL sampai di-import ulang.
--
-- Jalankan SEBELUM: node scripts/update_from_data_update.mjs --table pencatatan_non_tender_realisasi
-- Sesudah dijalankan, segarkan tipe TypeScript:
--   npx supabase gen types typescript --project-id bsskoapfeejutazpsyvd --schema public > database.types.ts
-- ============================================================================

ALTER TABLE public.pencatatan_non_tender_realisasi
  ADD COLUMN IF NOT EXISTS hps TEXT;
