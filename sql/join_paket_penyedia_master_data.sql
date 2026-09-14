-- Script untuk menggabungkan (join) tabel api_paket_penyedia_terumumkan dengan master_data
--
-- KUNCI JOIN: KODE SATKER + KODE PPK.
-- Alasan: 1 kode satker (mis. Setjen 450938) dipakai banyak Biro/PPK berbeda, sehingga
-- join hanya-satker membuat DISTINCT ON memilih PPK secara acak (PPK yang tampil salah).
-- Field SIRUP `nama_ppk` formatnya identik dengan master `KODE PPK` (nama ter-masking),
-- jadi itu kunci exact-match yang unik per PPK.
--
-- Strategi kolom:
--   * Field level-SATKER (UNIT KERJA/eselon-1, WILAYAH, KPA, KODE UNIT) konstan per kode
--     satker  -> TETAP diambil selama satker cocok, walau PPK tidak match.
--   * Field level-PPK (SATUAN KERJA/Biro, SATKER, NAMA PPK, NIP PPK, NO) berbeda per PPK
--     -> hanya diisi saat nama_ppk == KODE PPK; jika tidak, NULL (dashboard fallback ke
--     nama_ppk/nama_satker SIRUP yang identitasnya tetap benar meski ter-masking).

-- CATATAN: urutan kolom dijaga persis seperti versi lama agar CREATE OR REPLACE VIEW
-- tidak ditolak Postgres (reorder/hapus kolom butuh DROP CASCADE + recreate dependennya).

CREATE OR REPLACE VIEW view_paket_penyedia_master_data AS
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
    api_paket_penyedia_terumumkan p
LEFT JOIN
    master_data m
ON
    p.kd_satker_str::text = m."KODE SATKER_str"
ORDER BY
    p.kd_rup,
    (p.nama_ppk = m."KODE PPK") DESC NULLS LAST,   /* utamakan baris yang PPK-nya match */
    m."NO";                                        /* tie-breaker deterministik */
