-- ============================================================================
-- PATCH: paket_e_purchasing — tambah kolom is_swasta
-- ----------------------------------------------------------------------------
-- MASALAH
-- Tarikan 3 September 2026 dari endpoint e-Katalog
-- (/v1/ekatalog/paket-e-purchasing) menambah field baru `is_swasta` — hadir di
-- seluruh 1.282 baris file. Kolomnya belum ada di tabel, sehingga
-- scripts/update_from_data_update.mjs berhenti pada tahap periksa dan
-- **tidak menulis apa pun ke tabel mana pun** (perilaku sengaja: satu tabel
-- gagal = semua batal).
--
-- SOLUSI
-- Tambah kolom. Tipe BOOLEAN, bukan TEXT, karena sumber memang mengirim boolean
-- JSON (`false`, bukan `"false"`). Ini beda dari `flag_minikom` yang TEXT:
-- nilai flag_minikom di sumber adalah string "Ya"/"Tidak", jadi TEXT memang
-- tepat di sana. Kalau is_swasta dibuat TEXT, aturan "nilai tidak pernah
-- dinormalisasi" akan menyimpannya sebagai string "false" dan setiap filter
-- hilir harus menulis = 'false' alih-alih IS FALSE.
--
-- CATATAN
-- - Per tarikan ini seluruh 1.282 baris bernilai false; belum ada satu pun true.
--   Kolom dibiarkan nullable tanpa DEFAULT supaya baris lama tetap NULL dan bisa
--   dibedakan dari "sudah di-import dan memang false".
-- - Tidak ada kolom yang di-rename atau dihapus. View yang membaca tabel ini
--   (view_dashboard_epurchasing_v6) tidak terpengaruh — kolom hanya ditambah.
-- - Pola dan alasannya sama persis dengan 70_alter_paket_e_purchasing_products.sql.
--
-- URUTAN JALAN
--   1. Jalankan file ini di Supabase SQL Editor.
--   2. Segarkan tipe TypeScript:
--      npx supabase gen types typescript --project-id bsskoapfeejutazpsyvd --schema public > database.types.ts
--   3. node scripts/update_from_data_update.mjs --dry-run --all
--   4. node scripts/update_from_data_update.mjs --all
--
-- VERIFIKASI (jalankan sesudah langkah 1)
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name  = 'paket_e_purchasing'
--     AND column_name = 'is_swasta';
--   -- harus mengembalikan 1 baris: is_swasta | boolean | YES
-- ============================================================================

ALTER TABLE public.paket_e_purchasing
  ADD COLUMN IF NOT EXISTS is_swasta BOOLEAN;

COMMENT ON COLUMN public.paket_e_purchasing.is_swasta IS
  'Penanda penyedia swasta dari endpoint e-Katalog. Ditambahkan 3 September 2026; baris hasil import sebelum tanggal itu bernilai NULL.';
