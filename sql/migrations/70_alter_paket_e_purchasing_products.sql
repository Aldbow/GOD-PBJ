-- ============================================================================
-- PATCH: paket_e_purchasing — tambah kolom products
-- ----------------------------------------------------------------------------
-- File sumber paket-e-purchasing_2026.json (endpoint e-Katalog) sekarang
-- mengirim field `products` (JSON string berisi array rincian produk per
-- order_id: qty, product_id, final_price, origin_price, product_name).
-- Kolom ini belum ada di tabel, jadi PostgREST menolak seluruh batch dengan
-- PGRST204 ("column ... does not exist").
--
-- Disimpan sebagai TEXT (nilai sudah berupa string JSON dari sumber, tidak
-- diubah/diparsing di sisi script per aturan "nilai tidak pernah dinormalisasi").
--
-- Semua kolom lama tetap ada, tidak ada rename/hapus kolom. Baris lama akan
-- bernilai NULL sampai di-import ulang.
--
-- Jalankan SEBELUM: node scripts/update_from_data_update.mjs --table paket_e_purchasing
-- Sesudah dijalankan, segarkan tipe TypeScript:
--   npx supabase gen types typescript --project-id bsskoapfeejutazpsyvd --schema public > database.types.ts
-- ============================================================================

ALTER TABLE public.paket_e_purchasing
  ADD COLUMN IF NOT EXISTS products TEXT;
