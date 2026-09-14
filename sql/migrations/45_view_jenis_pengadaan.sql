-- ============================================================================
-- Menambahkan kolom jenis_pengadaan (Barang / Jasa Konsultansi / Jasa Lainnya /
-- Pekerjaan Konstruksi) ke view Tender, Pengadaan Langsung, Penunjukan Langsung,
-- E-Purchasing, dan view_dashboard_gabungan_satker.
-- ----------------------------------------------------------------------------
-- SUMBER
--   Kolom jenis_pengadaan sudah ada di tabel api_paket_penyedia_terumumkan
--   (hasil import 260630_paket-penyedia-terumumkan.csv) dan sudah ikut terbawa
--   ke view_paket_penyedia_master_data lewat `p.*` (lihat 30_view_base_master_data.sql).
--   Hanya belum diselect eksplisit di view dashboard turunannya.
--
-- CAKUPAN
--   - Tender, Pengadaan Langsung, Penunjukan Langsung: jenis_pengadaan asli dari SIRUP
--     (via alias pl, filter metode_pengadaan masing-masing).
--   - E-Purchasing: paket E-Purchasing JUGA tercatat di api_paket_penyedia_terumumkan
--     (metode_pengadaan = 'E-Purchasing', ~1.469 baris, mayoritas sudah terklasifikasi
--     Barang/Jasa Lainnya) dan view_dashboard_epurchasing_v6 SUDAH JOIN ke tabel ini
--     lewat alias m — hanya belum diselect. Ditambahkan di sini.
--   - Swakelola: sumber CSV-nya (api_paket_swakelola_terumumkan) TIDAK PERNAH punya
--     kolom ini sama sekali -> NULL di view ini. Swakelola memang diklasifikasikan
--     pakai tipe_swakelola (I-IV), bukan taksonomi Barang/Jasa/Konstruksi/Konsultansi
--     -> di-relabel jadi kategori "Swakelola" tersendiri di layer TS (ringkasanData.ts),
--     bukan diasumsikan salah satu jenis.
--
-- CATATAN
--   - Definisi di bawah = definisi final saat ini (40_views_realisasi_tender_pl_pnl.sql
--     untuk Tender, 43_view_pengadaan_langsung_metode.sql untuk PL,
--     42_views_lock_pagu.sql untuk PnL, 44_view_epurchasing_final.sql untuk
--     E-Purchasing, 41_views_is_from_sirup_gabungan.sql untuk gabungan), HANYA kolom
--     jenis_pengadaan yang ditambahkan DI AKHIR agar CREATE OR REPLACE VIEW tetap
--     valid untuk view yang bergantung padanya.
--   - Jalankan di Supabase SQL Editor setelah 44_view_epurchasing_final.sql.
-- ============================================================================

-- 1. E-PURCHASING ---------------------------------------------------------------
CREATE OR REPLACE VIEW view_dashboard_epurchasing_v6 AS
SELECT
    COALESCE(m.kd_rup, mapped_e.resolved_rup) as kd_rup,
    COALESCE(m.nama_paket, mapped_e.rup_name) as rup_name,
    COALESCE(m.pagu, 0) as pagu,
    m.tgl_pengumuman_paket,
    m.status_aktif_rup,
    COALESCE(m."MASTER_NAMA_PPK", 'Tidak Diketahui') as nama_ppk,
    COALESCE(m."UNIT KERJA",
        (SELECT m3."UNIT KERJA" FROM master_data m3 WHERE LTRIM(m3."KODE SATKER_str", '0') = LTRIM(mapped_e.kode_satker, '0') AND m3."UNIT KERJA" IS NOT NULL LIMIT 1),
        (SELECT m2."UNIT KERJA"
           FROM satker_kode_alias a
           JOIN master_data m2 ON LTRIM(m2."KODE SATKER_str", '0') = LTRIM(a.kode_master, '0')
          WHERE LTRIM(a.kode_alias, '0') = LTRIM(mapped_e.kode_satker, '0')
            AND m2."UNIT KERJA" IS NOT NULL
          LIMIT 1),
        (SELECT v."UNIT KERJA" FROM view_paket_penyedia_master_data v WHERE UPPER(v."SATUAN KERJA") = UPPER(mapped_e.nama_satker) AND v."UNIT KERJA" IS NOT NULL LIMIT 1),
        'Tidak Diketahui'
    ) as eselon1,
    COALESCE(m."SATUAN KERJA",
        (SELECT a.satuan_kerja FROM satker_kode_alias a WHERE LTRIM(a.kode_alias, '0') = LTRIM(mapped_e.kode_satker, '0') AND a.satuan_kerja IS NOT NULL LIMIT 1),
        NULLIF(m.nama_satker, ''),
        NULLIF(m."KPA", ''),
        (SELECT m3."KPA" FROM master_data m3 WHERE LTRIM(m3."KODE SATKER_str", '0') = LTRIM(mapped_e.kode_satker, '0') AND m3."KPA" IS NOT NULL LIMIT 1),
        mapped_e.nama_satker,
        'Tidak Diketahui'
    ) as satker,
    COALESCE(m.kd_klpd, mapped_e.kode_klpd) as kode_klpd,
    COALESCE(mapped_e.status, 'BELUM REALISASI') as status,
    COALESCE(mapped_e.total, 0) as total,
    mapped_e.kode_penyedia,
    mapped_e.order_id,
    m.status_kurasi,
    m.catatan_kurasi,
    m.rekomendasi_kurasi,
    CASE WHEN m.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    m.jenis_pengadaan
FROM (
    SELECT *
    FROM view_paket_penyedia_master_data
    WHERE metode_pengadaan = 'E-Purchasing'
) m
FULL OUTER JOIN (
    SELECT
        COALESCE(rf.final_rup, e.rup_code::bigint) as resolved_rup,
        MAX(e.rup_name) as rup_name,
        MAX(e.nama_satker) as nama_satker,
        MAX(e.kode_satker) as kode_satker,
        MAX(e.kode_klpd) as kode_klpd,
        MAX(e.status) as status,
        SUM(e.total) as total,
        STRING_AGG(DISTINCT e.kode_penyedia, ', ') as kode_penyedia,
        STRING_AGG(DISTINCT e.order_id, ', ') as order_id
    FROM paket_e_purchasing e
    LEFT JOIN view_rup_final rf ON e.rup_code::bigint = rf.origin_rup
    WHERE (e.status NOT ILIKE '%cancel%' OR e.status IS NULL)
    GROUP BY COALESCE(rf.final_rup, e.rup_code::bigint)
) mapped_e ON m.kd_rup = mapped_e.resolved_rup
WHERE COALESCE(m.kd_rup, mapped_e.resolved_rup) NOT IN (
      SELECT kd_rup_lama
      FROM history_kaji_ulang
      WHERE kd_rup_lama <> kd_rup_baru
  );

-- 2. TENDER -------------------------------------------------------------------
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
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi,
    pl.jenis_pengadaan
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')) pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup LEFT JOIN anggaran_penyedia pap_sum ON pap_sum.kd_rup = split_part(g.kd_rup, ';', 1)
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- 3. PENGADAAN LANGSUNG ---------------------------------------------------------
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
        MAX(nts.nama_penyedia) as nama_penyedia, MAX(nts.nama_paket) as nama_paket, MAX(nts.pagu) as pagu, MAX(nts.nama_satker) as nama_satker, MAX(nts.kd_satker_str) as kd_satker_str,
        MAX(nts.mtd_pemilihan) as mtd_pemilihan
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
    COALESCE(pl.metode_pengadaan, t.mtd_pemilihan, 'Tidak Diketahui') AS metode_pengadaan,
    CASE WHEN (COALESCE(p.total, 0) + COALESCE(t.total, 0)) > 0 THEN 'COMPLETED' ELSE 'BELUM REALISASI' END AS status,
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi,
    pl.jenis_pengadaan
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Pengadaan Langsung', 'Dikecualikan')) pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- 4. PENUNJUKAN LANGSUNG ----------------------------------------------------
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
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi,
    pl.jenis_pengadaan
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan = 'Penunjukan Langsung') pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- 5. GABUNGAN SATKER ----------------------------------------------------------
-- Swakelola tidak punya sumber jenis_pengadaan -> NULL di sini, di-relabel jadi
-- kategori "Swakelola" di layer TS. E-Purchasing kini ikut membawa jenis_pengadaan asli.
CREATE OR REPLACE VIEW view_dashboard_gabungan_satker AS
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'E-Purchasing' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup, jenis_pengadaan
FROM view_dashboard_epurchasing_v6
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup, jenis_pengadaan
FROM view_dashboard_pengadaan_langsung
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'Penunjukan Langsung' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup, jenis_pengadaan
FROM view_dashboard_penunjukan_langsung
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup, jenis_pengadaan
FROM view_dashboard_tender
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'Swakelola' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup, NULL::text AS jenis_pengadaan
FROM view_dashboard_swakelola_v1;

-- ============================================================================
-- VERIFIKASI (opsional) — jalankan setelah di atas
-- ----------------------------------------------------------------------------
-- Distribusi jenis pengadaan per metode (hanya Swakelola yang harus NULL total;
-- E-Purchasing/Tender/PL/PnL boleh punya sebagian NULL dari paket "anomali" —
-- realisasi tanpa RUP terumumkan di SIRUP, lihat is_from_sirup):
--   SELECT metode_pengadaan, jenis_pengadaan, COUNT(*)
--   FROM view_dashboard_gabungan_satker
--   GROUP BY metode_pengadaan, jenis_pengadaan
--   ORDER BY 1, 3 DESC;
-- ============================================================================
