-- ============================================================================
-- FUNCTIONAL INDEX untuk join satker ber-normalisasi LTRIM('0')
-- ----------------------------------------------------------------------------
-- Setelah join di view_paket_penyedia_master_data & view_paket_swakelola_master_data
-- diubah dari:
--     p.kd_satker_str::text = m."KODE SATKER_str"
-- menjadi:
--     LTRIM(p.kd_satker_str::text, '0') = LTRIM(m."KODE SATKER_str", '0')
-- index exact-match lama (idx_paket_terumumkan_kd_satker_str_text,
-- idx_master_data_kode_satker_str) TIDAK lagi dipakai Postgres, karena ekspresi
-- JOIN kini dibungkus LTRIM. Tanpa index yang cocok, view kembali full-scan dan
-- bisa memicu "statement timeout" seperti sebelumnya.
--
-- Index di bawah dibuat PERSIS sama dengan ekspresi LTRIM di kondisi JOIN agar
-- dipakai planner. Jalankan di Supabase SQL Editor.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_paket_terumumkan_kd_satker_ltrim
  ON api_paket_penyedia_terumumkan ((LTRIM(kd_satker_str::text, '0')));

CREATE INDEX IF NOT EXISTS idx_paket_swakelola_kd_satker_ltrim
  ON api_paket_swakelola_terumumkan ((LTRIM(kd_satker_str::text, '0')));

CREATE INDEX IF NOT EXISTS idx_master_data_kode_satker_ltrim
  ON master_data ((LTRIM("KODE SATKER_str", '0')));

-- Opsional: index exact-match lama boleh dipertahankan (dipakai view lain yang
-- masih membandingkan kode secara exact) atau di-drop bila sudah tidak ada
-- pemakainya:
--   DROP INDEX IF EXISTS idx_paket_terumumkan_kd_satker_str_text;
--   DROP INDEX IF EXISTS idx_master_data_kode_satker_str;
-- ============================================================================
