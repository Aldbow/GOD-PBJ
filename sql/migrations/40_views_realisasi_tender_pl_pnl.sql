-- ============================================================================
-- FIX: Realisasi RUP hasil "kaji ulang" tidak terpetakan ke RUP final
-- pada view Pengadaan Langsung, Penunjukan Langsung, dan Tender
-- ----------------------------------------------------------------------------
-- MASALAH
--   Realisasi di non_tender_selesai / tender_selesai_nilai memakai kd_rup LAMA.
--   Setelah kaji ulang, RUP diumumkan ulang dengan kd_rup BARU (ada di
--   api_paket_penyedia_terumumkan / penyedia master). Ketiga view ini
--   menggabungkan realisasi berdasarkan kd_rup MENTAH tanpa memetakan lama->final,
--   sehingga RUP lama bocor sebagai baris terpisah dengan:
--     - metode_pengadaan = 'Tidak Diketahui' (metadata tidak ketemu di penyedia master)
--     - realisasi menempel di baris lama, sementara baris RUP baru "BELUM REALISASI"
--     - pagu terhitung ganda (baris lama + baris baru)
--
-- SOLUSI (mengikuti pola view_dashboard_epurchasing_v6 yang SUDAH benar)
--   1. Di tiap CTE realisasi (pencatatan / transaksional), petakan kunci RUP
--      lama -> final via view_rup_final SEBELUM agregasi, sehingga realisasi
--      menempel ke RUP final yang metadatanya ada di penyedia master.
--   2. Kecualikan kd_rup_lama dari hasil akhir (NOT IN history_kaji_ulang).
--
-- CATATAN
--   - view_rup_final(origin_rup, final_rup) menyelesaikan rantai kaji ulang
--     berulang sampai RUP terminal.
--   - Perbaikan ini menyentuh logika realisasi inti — uji dulu di Supabase.
--   - CREATE OR REPLACE menjaga kolom output identik, sehingga
--     view_dashboard_gabungan_satker yang bergantung padanya tetap valid.
--   - Edge case yang BELUM tercakup: RUP gabungan dengan kd_rup literal "a;b"
--     pada tabel realisasi (tidak bisa dipetakan via origin_rup tunggal).
--     Jumlahnya sangat kecil; ditangani terpisah bila diperlukan.
--   Jalankan di Supabase SQL Editor.
-- ============================================================================

-- 1. TENDER -----------------------------------------------------------------
CREATE OR REPLACE VIEW view_dashboard_tender AS
WITH transaksional AS (
    SELECT COALESCE(rf.final_rup::text, tsn.kd_rup_paket) as kd_rup,
        MAX(tsn.nama_penyedia) as nama_penyedia, MAX(tsn.kd_penyedia) as kode_penyedia,
        SUM(COALESCE(NULLIF(tsn.nilai_kontrak, 0), NULLIF(tsn.nilai_negosiasi, 0), NULLIF(tsn.nilai_terkoreksi, 0), NULLIF(tsn.nilai_penawaran, 0), NULLIF(tsn.hps, 0), 0)) as total
    FROM tender_selesai_nilai tsn
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = tsn.kd_rup_paket
    GROUP BY COALESCE(rf.final_rup::text, tsn.kd_rup_paket)
),
anggaran_penyedia AS (
    SELECT CAST(utama.kd_rup AS text) as kd_rup,
        SUM(CASE WHEN utama.tahun_anggaran_dana = '2026' THEN utama.pagu WHEN utama.tahun_anggaran_dana = '2027' THEN (COALESCE(pendukung.pagu, 0) - COALESCE(utama.pagu, 0)) ELSE utama.pagu END) as pagu
    FROM paket_anggaran_penyedia utama LEFT JOIN api_paket_penyedia_terumumkan pendukung ON utama.kd_rup = pendukung.kd_rup GROUP BY utama.kd_rup
),
gabungan_rup AS (
    SELECT pap.kd_rup FROM anggaran_penyedia pap JOIN view_paket_penyedia_master_data v ON CAST(v.kd_rup AS text) = pap.kd_rup WHERE v.metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')
    UNION SELECT kd_rup FROM transaksional
)
SELECT
    g.kd_rup, COALESCE(pl.nama_paket, 'Paket Tidak Diketahui') AS rup_name, COALESCE(pap_sum.pagu, 0) AS pagu, COALESCE(t.total, 0) AS total,
    COALESCE(pl."MASTER_NAMA_PPK", pl.nama_ppk, 'Anomali/Tidak Diketahui') AS nama_ppk, COALESCE(pl."SATUAN KERJA", pl.nama_satker, 'Satker Tidak Diketahui') AS satker,
    COALESCE(pl."UNIT KERJA", (SELECT m."UNIT KERJA" FROM master_data m WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(CAST(pl.kd_satker_str AS text), '0') AND m."UNIT KERJA" IS NOT NULL LIMIT 1)) AS eselon1,
    pl.status_aktif_rup, COALESCE(t.nama_penyedia, t.kode_penyedia) AS kode_penyedia,
    CASE WHEN g.kd_rup LIKE '%;%' THEN true ELSE false END AS is_multiple_rup, CASE WHEN pl.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    COALESCE(pl.metode_pengadaan, 'Tidak Diketahui') AS metode_pengadaan,
    CASE WHEN COALESCE(t.total, 0) > 0 THEN 'COMPLETED' ELSE 'BELUM REALISASI' END AS status,
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')) pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup LEFT JOIN anggaran_penyedia pap_sum ON pap_sum.kd_rup = split_part(g.kd_rup, ';', 1)
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- 2. PENUNJUKAN LANGSUNG ----------------------------------------------------
CREATE OR REPLACE VIEW view_dashboard_penunjukan_langsung AS
WITH pencatatan AS (
    SELECT COALESCE(rf.final_rup::text, pnr.kd_rup_paket) as kd_rup_paket,
        SUM(CAST(REPLACE(CAST(pnr.nilai_realisasi AS text), ',', '.') AS numeric)) as total, MAX(pnr.nama_penyedia) as nama_penyedia
    FROM pencatatan_non_tender_realisasi pnr
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = pnr.kd_rup_paket
    WHERE pnr.nilai_realisasi IS NOT NULL AND pnr.nilai_realisasi != '' GROUP BY COALESCE(rf.final_rup::text, pnr.kd_rup_paket)
),
transaksional AS (
    SELECT COALESCE(rf.final_rup::text, nts.kd_rup) as kd_rup,
        SUM(CAST(REPLACE(COALESCE(NULLIF(nts.nilai_kontrak, ''), NULLIF(nts.nilai_negosiasi, ''), '0'), ',', '.') AS numeric)) as total,
        MAX(nts.nama_penyedia) as nama_penyedia, MAX(nts.nama_paket) as nama_paket, MAX(nts.pagu) as pagu, MAX(nts.nama_satker) as nama_satker, MAX(nts.kd_satker_str) as kd_satker_str
    FROM non_tender_selesai nts
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = nts.kd_rup
    WHERE nts.mtd_pemilihan = 'Penunjukan Langsung' GROUP BY COALESCE(rf.final_rup::text, nts.kd_rup)
),
gabungan_rup AS (
    SELECT CAST(kd_rup AS text) as kd_rup FROM view_paket_penyedia_master_data WHERE metode_pengadaan = 'Penunjukan Langsung' UNION SELECT kd_rup FROM transaksional
)
SELECT
    g.kd_rup, COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name, COALESCE(pl.pagu, CAST(NULLIF(t.pagu, '') AS numeric), 0) AS pagu,
    COALESCE(p.total, 0) AS total_pencatatan, COALESCE(t.total, 0) AS total_transaksional, (COALESCE(p.total, 0) + COALESCE(t.total, 0)) AS total,
    COALESCE(pl."MASTER_NAMA_PPK", pl.nama_ppk, 'Anomali/Tidak Diketahui') AS nama_ppk, COALESCE(pl."SATUAN KERJA", pl.nama_satker, t.nama_satker, 'Satker Tidak Diketahui') AS satker,
    COALESCE(pl."UNIT KERJA", (SELECT m."UNIT KERJA" FROM master_data m WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(COALESCE(CAST(pl.kd_satker_str AS text), t.kd_satker_str), '0') AND m."UNIT KERJA" IS NOT NULL LIMIT 1)) AS eselon1,
    pl.status_aktif_rup, COALESCE(t.nama_penyedia, p.nama_penyedia) AS kode_penyedia,
    CASE WHEN g.kd_rup LIKE '%;%' THEN true ELSE false END AS is_multiple_rup, CASE WHEN pl.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    CASE WHEN (COALESCE(p.total, 0) + COALESCE(t.total, 0)) > 0 THEN 'COMPLETED' ELSE 'BELUM REALISASI' END AS status,
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan = 'Penunjukan Langsung') pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- 3. PENGADAAN LANGSUNG -----------------------------------------------------
CREATE OR REPLACE VIEW view_dashboard_pengadaan_langsung AS
WITH pencatatan AS (
    SELECT COALESCE(rf.final_rup::text, pnr.kd_rup_paket) as kd_rup_paket,
        SUM(CAST(REPLACE(CAST(pnr.nilai_realisasi AS text), ',', '.') AS numeric)) as total, MAX(pnr.nama_penyedia) as nama_penyedia
    FROM pencatatan_non_tender_realisasi pnr
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = pnr.kd_rup_paket
    WHERE pnr.nilai_realisasi IS NOT NULL AND pnr.nilai_realisasi != '' GROUP BY COALESCE(rf.final_rup::text, pnr.kd_rup_paket)
),
transaksional AS (
    SELECT COALESCE(rf.final_rup::text, nts.kd_rup) as kd_rup,
        SUM(CAST(REPLACE(COALESCE(NULLIF(nts.nilai_kontrak, ''), NULLIF(nts.nilai_negosiasi, ''), '0'), ',', '.') AS numeric)) as total,
        MAX(nts.nama_penyedia) as nama_penyedia, MAX(nts.nama_paket) as nama_paket, MAX(nts.pagu) as pagu, MAX(nts.nama_satker) as nama_satker, MAX(nts.kd_satker_str) as kd_satker_str
    FROM non_tender_selesai nts
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = nts.kd_rup
    WHERE nts.mtd_pemilihan IN ('Pengadaan Langsung', 'Dikecualikan') GROUP BY COALESCE(rf.final_rup::text, nts.kd_rup)
),
gabungan_rup AS (
    SELECT CAST(kd_rup AS text) as kd_rup FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Pengadaan Langsung', 'Dikecualikan') UNION SELECT kd_rup FROM transaksional
)
SELECT
    g.kd_rup, COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name, COALESCE(pl.pagu, CAST(NULLIF(t.pagu, '') AS numeric), 0) AS pagu,
    COALESCE(p.total, 0) AS total_pencatatan, COALESCE(t.total, 0) AS total_transaksional, (COALESCE(p.total, 0) + COALESCE(t.total, 0)) AS total,
    COALESCE(pl."MASTER_NAMA_PPK", pl.nama_ppk, 'Anomali/Tidak Diketahui') AS nama_ppk, COALESCE(pl."SATUAN KERJA", pl.nama_satker, t.nama_satker, 'Satker Tidak Diketahui') AS satker,
    COALESCE(pl."UNIT KERJA", (SELECT m."UNIT KERJA" FROM master_data m WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(COALESCE(CAST(pl.kd_satker_str AS text), t.kd_satker_str), '0') AND m."UNIT KERJA" IS NOT NULL LIMIT 1)) AS eselon1,
    pl.status_aktif_rup, COALESCE(t.nama_penyedia, p.nama_penyedia) AS kode_penyedia,
    CASE WHEN g.kd_rup LIKE '%;%' THEN true ELSE false END AS is_multiple_rup, CASE WHEN pl.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    COALESCE(pl.metode_pengadaan, 'Tidak Diketahui') AS metode_pengadaan,
    CASE WHEN (COALESCE(p.total, 0) + COALESCE(t.total, 0)) > 0 THEN 'COMPLETED' ELSE 'BELUM REALISASI' END AS status,
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Pengadaan Langsung', 'Dikecualikan')) pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- ============================================================================
-- VERIFIKASI (opsional) — jalankan setelah di atas
-- ----------------------------------------------------------------------------
-- Harus 0 (atau hanya menyisakan edge case RUP gabungan literal "a;b"):
--   SELECT metode_pengadaan, COUNT(*)
--   FROM view_dashboard_gabungan_satker
--   WHERE metode_pengadaan = 'Tidak Diketahui'
--   GROUP BY metode_pengadaan;
--
-- Cek realisasi kini menempel ke RUP final (mis. 67374842 harus COMPLETED):
--   SELECT kd_rup, metode_pengadaan, pagu, total, status
--   FROM view_dashboard_gabungan_satker
--   WHERE kd_rup IN ('67374842','66901975','66259602');
-- ============================================================================
