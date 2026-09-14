-- ============================================================================
-- FIX LEADING-ZERO: normalisasi kunci join satker di base view master data
-- ----------------------------------------------------------------------------
-- MASALAH
--   Tabel SIRUP (api_paket_penyedia_terumumkan / api_paket_swakelola_terumumkan)
--   menyimpan sebagian kd_satker_str DENGAN '0' di depan, mis:
--     021212 Balai Vokasi Bandung Barat   (master: 21212)
--     035636 Balai Vokasi Surakarta        (master: 35636)
--     050302 Balai Vokasi Sidoarjo         (master: 50302)
--     051102 Balai Vokasi Banyuwangi       (master: 51102)
--     065106 Balai Vokasi Banda Aceh       (master: 65106)
--     089378 Balai Vokasi Padang           (master: 89378)
--   master_data menyimpannya TANPA '0'. Join exact (=) gagal -> nama SATUAN
--   KERJA/KPA/WILAYAH kosong & satker jatuh ke nama SIRUP mentah.
--
-- SOLUSI
--   Ubah kunci join menjadi LTRIM('0') di kedua sisi. Definisi di bawah = definisi
--   TERKINI yang ter-deploy (migrate_and_update_kurasi_final.sql: p.* + kolom
--   master + kolom kurasi via ai_kurasi_paket). HANYA kondisi JOIN yang berubah,
--   sehingga kolom output identik -> CREATE OR REPLACE valid & view dependen sah.
--
-- PRASYARAT: jalankan add_index_ltrim_satker.sql (functional index) agar tidak
--   full-scan. Urutan jalan di Supabase SQL Editor:
--     1) add_index_ltrim_satker.sql
--     2) file ini
--     3) create_view_dashboard_epurchasing_v6.sql (jika belum)
-- ============================================================================

-- 1. PENYEDIA ---------------------------------------------------------------
CREATE OR REPLACE VIEW view_paket_penyedia_master_data AS
SELECT DISTINCT ON (p.kd_rup)
    p.*,
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NO"           END AS "NO",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."SATUAN KERJA" END AS "SATUAN KERJA",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."SATKER"       END AS "SATKER",
    m."KPA",
    m."KODE UNIT",
    m."UNIT KERJA",
    m."WILAYAH",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."KODE PPK"     END AS "KODE PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NAMA PPK"     END AS "MASTER_NAMA_PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NIP PPK"      END AS "MASTER_NIP_PPK",
    ak.status_kurasi,
    ak.catatan_kurasi,
    ak.rekomendasi_kurasi
FROM api_paket_penyedia_terumumkan p
LEFT JOIN master_data m ON LTRIM(p.kd_satker_str::text, '0') = LTRIM(m."KODE SATKER_str", '0')
LEFT JOIN ai_kurasi_paket ak ON p.kd_rup::bigint = ak.kd_rup
ORDER BY p.kd_rup, (p.nama_ppk = m."KODE PPK") DESC NULLS LAST, m."NO";

-- 2. SWAKELOLA --------------------------------------------------------------
CREATE OR REPLACE VIEW view_paket_swakelola_master_data AS
SELECT DISTINCT ON (p.kd_rup)
    p.*,
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NO"           END AS "NO",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."SATUAN KERJA" END AS "SATUAN KERJA",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."SATKER"       END AS "SATKER",
    m."KPA",
    m."KODE UNIT",
    m."UNIT KERJA",
    m."WILAYAH",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."KODE PPK"     END AS "KODE PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NAMA PPK"     END AS "MASTER_NAMA_PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NIP PPK"      END AS "MASTER_NIP_PPK",
    ak.status_kurasi,
    ak.catatan_kurasi,
    ak.rekomendasi_kurasi
FROM api_paket_swakelola_terumumkan p
LEFT JOIN master_data m ON LTRIM(p.kd_satker_str::text, '0') = LTRIM(m."KODE SATKER_str", '0')
LEFT JOIN ai_kurasi_paket ak ON p.kd_rup::bigint = ak.kd_rup
ORDER BY p.kd_rup, (p.nama_ppk = m."KODE PPK") DESC NULLS LAST, m."NO";

-- ============================================================================
-- VERIFIKASI (opsional) — jalankan sesudahnya
-- ----------------------------------------------------------------------------
-- 6 Balai Vokasi kini dapat nama & eselon1 dari master (bukan 'Tidak Diketahui'):
--   SELECT DISTINCT satker, eselon1
--   FROM view_dashboard_tender
--   WHERE eselon1 ILIKE '%vokasi%' OR satker ILIKE '%vokasi%';
--
-- Tidak ada lagi paket ber-kd_satker_str yang gagal dapat nama master
-- semata-mata karena leading-zero:
--   SELECT COUNT(*) FROM view_paket_penyedia_master_data
--   WHERE kd_satker_str IS NOT NULL AND "KPA" IS NULL
--     AND LTRIM(kd_satker_str::text,'0') IN (SELECT LTRIM("KODE SATKER_str",'0') FROM master_data);
--   -- harus 0
-- ============================================================================
