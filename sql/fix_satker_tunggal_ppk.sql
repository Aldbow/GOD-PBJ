-- ============================================================================
-- FIX: auto-resolve SATUAN KERJA/PPK saat satu kode satker hanya punya SATU PPK
--      tercatat di master_data (tidak ambigu) — lanjutan dari fix_join_ltrim_satker.sql
-- ----------------------------------------------------------------------------
-- LATAR BELAKANG
--   view_paket_penyedia_master_data / view_paket_swakelola_master_data mem-NULL-kan
--   kolom level-PPK ("SATUAN KERJA", MASTER_NAMA_PPK, dst) kecuali nama_ppk mentah
--   SIRUP (p.nama_ppk) persis sama dengan KODE PPK di master_data:
--     CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."SATUAN KERJA" END
--   Gating ini SENGAJA (lihat komentar di fix_join_ltrim_satker.sql): satu kode
--   satker bisa dipakai banyak PPK berbeda, jadi tanpa exact-match PPK, DISTINCT ON
--   bisa memilih PPK yang salah.
--
--   TAPI: kalau kode satker itu di master_data cuma py SATU PPK tercatat, tidak ada
--   ambiguitas sama sekali — PPK itu PASTI PPK-nya, exact-match nama_ppk tidak
--   diperlukan. Audit langsung ke data (2026-07-30) menunjukkan 195 baris di
--   risiko_pengadaan (Penyedia) kena satker/PPK kosong, 147 di antaranya (75%)
--   berasal dari 5 satker yang justru cuma py 1 PPK di master (Balai Vokasi
--   Bantaeng/Bandung/Belitung/Makassar/Bandung Barat) — gating PPK di sini murni
--   merugikan, bukan mencegah salah pilih.
--
-- SOLUSI
--   Tambah subquery yang menghitung jumlah PPK BERBEDA (distinct "KODE PPK") per
--   kode satker (LTRIM). Kolom level-PPK diisi bila nama_ppk cocok ATAU satker itu
--   cuma py <=1 PPK berbeda di master (tidak ambigu).
--
-- CATATAN: urutan & nama kolom output dipertahankan sama persis dgn
--   fix_join_ltrim_satker.sql supaya CREATE OR REPLACE VIEW tetap valid.
--
-- CARA PAKAI: jalankan file ini di Supabase SQL Editor SETELAH fix_join_ltrim_satker.sql.
--   Lalu klik tombol "Hitung Ulang" di halaman Risiko Pengadaan (atau POST ke
--   /api/risiko/recalculate/penyedia & /swakelola) supaya risiko_pengadaan terisi ulang.
-- ============================================================================

-- 1. PENYEDIA ---------------------------------------------------------------
CREATE OR REPLACE VIEW view_paket_penyedia_master_data AS
SELECT DISTINCT ON (p.kd_rup)
    p.*,
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."NO"           END AS "NO",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."SATUAN KERJA" END AS "SATUAN KERJA",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."SATKER"       END AS "SATKER",
    m."KPA",
    m."KODE UNIT",
    m."UNIT KERJA",
    m."WILAYAH",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."KODE PPK"     END AS "KODE PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."NAMA PPK"     END AS "MASTER_NAMA_PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."NIP PPK"      END AS "MASTER_NIP_PPK",
    ak.status_kurasi,
    ak.catatan_kurasi,
    ak.rekomendasi_kurasi
FROM api_paket_penyedia_terumumkan p
LEFT JOIN master_data m ON LTRIM(p.kd_satker_str::text, '0') = LTRIM(m."KODE SATKER_str", '0')
LEFT JOIN (
    SELECT LTRIM("KODE SATKER_str", '0') AS satker_key, COUNT(DISTINCT "KODE PPK") AS distinct_ppk_count
    FROM master_data
    GROUP BY LTRIM("KODE SATKER_str", '0')
) spk ON spk.satker_key = LTRIM(p.kd_satker_str::text, '0')
LEFT JOIN ai_kurasi_paket ak ON p.kd_rup::bigint = ak.kd_rup
ORDER BY p.kd_rup, (p.nama_ppk = m."KODE PPK") DESC NULLS LAST, m."NO";

-- 2. SWAKELOLA --------------------------------------------------------------
CREATE OR REPLACE VIEW view_paket_swakelola_master_data AS
SELECT DISTINCT ON (p.kd_rup)
    p.*,
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."NO"           END AS "NO",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."SATUAN KERJA" END AS "SATUAN KERJA",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."SATKER"       END AS "SATKER",
    m."KPA",
    m."KODE UNIT",
    m."UNIT KERJA",
    m."WILAYAH",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."KODE PPK"     END AS "KODE PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."NAMA PPK"     END AS "MASTER_NAMA_PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" OR spk.distinct_ppk_count <= 1 THEN m."NIP PPK"      END AS "MASTER_NIP_PPK",
    ak.status_kurasi,
    ak.catatan_kurasi,
    ak.rekomendasi_kurasi
FROM api_paket_swakelola_terumumkan p
LEFT JOIN master_data m ON LTRIM(p.kd_satker_str::text, '0') = LTRIM(m."KODE SATKER_str", '0')
LEFT JOIN (
    SELECT LTRIM("KODE SATKER_str", '0') AS satker_key, COUNT(DISTINCT "KODE PPK") AS distinct_ppk_count
    FROM master_data
    GROUP BY LTRIM("KODE SATKER_str", '0')
) spk ON spk.satker_key = LTRIM(p.kd_satker_str::text, '0')
LEFT JOIN ai_kurasi_paket ak ON p.kd_rup::bigint = ak.kd_rup
ORDER BY p.kd_rup, (p.nama_ppk = m."KODE PPK") DESC NULLS LAST, m."NO";

-- ============================================================================
-- VERIFIKASI (opsional) — jalankan sesudahnya
-- ----------------------------------------------------------------------------
-- Baris yang masih NULL "SATUAN KERJA" walau kd_satker_str ada & bukan lagi kasus
-- ambigu (>1 PPK) — sisanya seharusnya hanya satker dgn >1 PPK di master:
--   SELECT p.kd_satker_str, spk.distinct_ppk_count, COUNT(*)
--   FROM api_paket_penyedia_terumumkan p
--   LEFT JOIN (
--       SELECT LTRIM("KODE SATKER_str",'0') AS satker_key, COUNT(DISTINCT "KODE PPK") AS distinct_ppk_count
--       FROM master_data GROUP BY LTRIM("KODE SATKER_str",'0')
--   ) spk ON spk.satker_key = LTRIM(p.kd_satker_str::text,'0')
--   LEFT JOIN view_paket_penyedia_master_data v ON v.kd_rup = p.kd_rup
--   WHERE v."SATUAN KERJA" IS NULL AND p.kd_satker_str IS NOT NULL
--   GROUP BY p.kd_satker_str, spk.distinct_ppk_count
--   ORDER BY 3 DESC;
-- ============================================================================
