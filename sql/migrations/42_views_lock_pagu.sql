-- ============================================================================
-- LOCK PAGU KE MASTERDATA (SIRUP terumumkan) — jangan fallback ke tabel realisasi
-- ----------------------------------------------------------------------------
-- MASALAH
--   View Pengadaan Langsung, Penunjukan Langsung, dan Swakelola mengambil pagu
--   dengan fallback ke tabel REALISASI ketika master (SIRUP) tidak punya baris:
--     PL/PnL   : COALESCE(pl.pagu, CAST(NULLIF(t.pagu,'') AS numeric), 0)
--     Swakelola: COALESCE(m.pagu, e.pagu, 0)
--   Akibatnya paket ANOMALI (tidak ada RUP terumumkan / is_from_sirup = false)
--   tetap menampilkan angka pagu yang berasal dari catatan realisasi
--   (mis. 62660189;62660191 → pagu 209.031.000 diambil dari non_tender_selesai),
--   padahal secara perencanaan paket itu tidak punya pagu terumumkan.
--
-- SOLUSI
--   Pagu DIKUNCI ke masterdata (sisi kiri). Bila master tidak punya pagu → 0.
--   Tidak ada lagi pengambilan pagu dari tabel realisasi.
--     PL/PnL   : COALESCE(pl.pagu::numeric, 0)
--     Swakelola: COALESCE(m.pagu::numeric, 0)
--   Cast ::numeric wajib agar tipe kolom pagu tetap 'numeric' (sama seperti view
--   lama) — CREATE OR REPLACE menolak perubahan tipe kolom.
--   Total realisasi (kolom total) TIDAK diubah — hanya sumber pagu.
--
-- CATATAN
--   - Tender & E-Purchasing sudah benar: pagu bersumber dari perencanaan/master
--     (anggaran_penyedia / m.pagu), bukan tabel realisasi. Tidak disentuh.
--   - CREATE OR REPLACE menjaga kolom output identik → view_dashboard_gabungan_satker
--     yang bergantung padanya tetap valid dan otomatis ikut terkunci.
--   - Definisi di bawah = definisi terkini (fix_kaji_ulang_realisasi_views.sql +
--     add_is_from_sirup_flags.sql), HANYA ekspresi pagu yang berubah.
--   - Jalankan di Supabase SQL Editor (urut atas → bawah).
-- ============================================================================

-- 1. PENUNJUKAN LANGSUNG ----------------------------------------------------
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
    g.kd_rup, COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name, COALESCE(pl.pagu::numeric, 0) AS pagu,
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

-- 2. PENGADAAN LANGSUNG -----------------------------------------------------
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
    g.kd_rup, COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name, COALESCE(pl.pagu::numeric, 0) AS pagu,
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

-- 3. SWAKELOLA --------------------------------------------------------------
CREATE OR REPLACE VIEW view_dashboard_swakelola_v1 AS
SELECT
    COALESCE(m.kd_rup, e.kd_rup::bigint) as kd_rup, COALESCE(m.nama_paket, e.nama_paket) as rup_name, COALESCE(m.pagu::numeric, 0) as pagu,
    m.tgl_pengumuman_paket, m.status_aktif_rup, COALESCE(m."MASTER_NAMA_PPK", m.nama_ppk, 'Tidak Diketahui') as nama_ppk,
    COALESCE(m."UNIT KERJA", (SELECT v."UNIT KERJA" FROM view_paket_swakelola_master_data v WHERE UPPER(v."SATUAN KERJA") = UPPER(e.nama_satker) AND v."UNIT KERJA" IS NOT NULL LIMIT 1), 'Tidak Diketahui') as eselon1,
    COALESCE(m."SATUAN KERJA", e.nama_satker, 'Tidak Diketahui') as satker, COALESCE(m.kd_klpd, e.kd_klpd) as kode_klpd,
    COALESCE(e.status_swakelola_pct_ket, 'BELUM REALISASI') as status, COALESCE(e.total_realisasi, 0) as total,
    COALESCE(e.tipe_swakelola::text, m.tipe_swakelola::text) as tipe_swakelola, e.kd_swakelola_pct as order_id, '' as kode_penyedia,
    m.status_kurasi, m.catatan_kurasi, m.rekomendasi_kurasi,
    CASE WHEN m.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup
FROM view_paket_swakelola_master_data m
FULL OUTER JOIN api_pencatatan_swakelola e ON m.kd_rup::text = e.kd_rup::text
WHERE (e.status_swakelola_pct_ket NOT ILIKE '%cancel%' OR e.status_swakelola_pct_ket IS NULL);

-- ============================================================================
-- VERIFIKASI (opsional) — jalankan setelah di atas
-- ----------------------------------------------------------------------------
-- Paket anomali kini pagu = 0 (mis. 62660189;62660191 harus pagu 0, total tetap):
--   SELECT kd_rup, metode_pengadaan, pagu, total, is_from_sirup
--   FROM view_dashboard_gabungan_satker
--   WHERE kd_rup = '62660189;62660191';
--
-- Tidak ada baris is_from_sirup = false yang masih punya pagu > 0:
--   SELECT COUNT(*) FROM view_dashboard_gabungan_satker
--   WHERE is_from_sirup = false AND pagu > 0;   -- harus 0
-- ============================================================================
