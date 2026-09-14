-- Script untuk menggabungkan (join) tabel api_paket_swakelola_terumumkan dengan master_data
--
-- Pola disamakan dengan view_paket_penyedia_master_data agar konsisten:
-- KUNCI JOIN = KODE SATKER + KODE PPK (nama ter-masking), dengan field level-satker
-- (UNIT KERJA/eselon, WILAYAH, KPA, KODE UNIT) tetap terisi walau PPK tidak match.

-- CATATAN: urutan kolom dijaga persis seperti versi lama agar CREATE OR REPLACE VIEW
-- tidak ditolak Postgres (reorder/hapus kolom butuh DROP CASCADE + recreate dependennya).

CREATE OR REPLACE VIEW view_paket_swakelola_master_data AS
SELECT DISTINCT ON (p.kd_rup)
    p.*,
    /* Level PPK -> hanya bila nama_ppk (SIRUP) == KODE PPK (master) */
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NO"           END AS "NO",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."SATUAN KERJA" END AS "SATUAN KERJA",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."SATKER"       END AS "SATKER",
    /* Level SATKER (konstan per kode satker) -> diambil bila satker cocok */
    m."KPA",
    m."KODE UNIT",
    m."UNIT KERJA",
    m."WILAYAH",
    /* Level PPK */
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."KODE PPK"     END AS "KODE PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NAMA PPK"     END AS "MASTER_NAMA_PPK",
    CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."NIP PPK"      END AS "MASTER_NIP_PPK"
FROM
    api_paket_swakelola_terumumkan p
LEFT JOIN
    master_data m
ON
    p.kd_satker_str::text = m."KODE SATKER_str"
ORDER BY
    p.kd_rup,
    (p.nama_ppk = m."KODE PPK") DESC NULLS LAST,   /* utamakan baris yang PPK-nya match */
    m."NO";                                        /* tie-breaker deterministik */
