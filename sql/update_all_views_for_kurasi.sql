-- JALANKAN SCRIPT INI DI SUPABASE SQL EDITOR UNTUK MEMPERBARUI SEMUA VIEW
-- SCRIPT INI MENGGUNAKAN CASCADE UNTUK MENGATASI ERROR "cannot change name of view column"

-- 1. DROP SEMUA VIEW MASTER DATA (CASCADE AKAN OTOMATIS MENGHAPUS VIEW DASHBOARD YANG BERGANTUNG PADANYA)
DROP VIEW IF EXISTS view_paket_penyedia_master_data CASCADE;
DROP VIEW IF EXISTS view_paket_swakelola_master_data CASCADE;

-- 2. RECREATE VIEW MASTER DATA
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
LEFT JOIN master_data m ON p.kd_satker_str::text = m."KODE SATKER_str"
LEFT JOIN ai_kurasi_paket ak ON p.kd_rup::bigint = ak.kd_rup
ORDER BY p.kd_rup, (p.nama_ppk = m."KODE PPK") DESC NULLS LAST, m."NO";

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
LEFT JOIN master_data m ON p.kd_satker_str::text = m."KODE SATKER_str"
LEFT JOIN ai_kurasi_paket ak ON p.kd_rup::bigint = ak.kd_rup
ORDER BY p.kd_rup, (p.nama_ppk = m."KODE PPK") DESC NULLS LAST, m."NO";

-- 3. RECREATE E-PURCHASING (Menggunakan logika History Kaji Ulang)
CREATE OR REPLACE VIEW view_dashboard_epurchasing_v6 AS
SELECT 
    COALESCE(m.kd_rup, mapped_e.resolved_rup) as kd_rup, 
    COALESCE(m.nama_paket, mapped_e.rup_name) as rup_name,
    COALESCE(m.pagu, 0) as pagu, 
    m.tgl_pengumuman_paket, 
    m.status_aktif_rup, 
    COALESCE(m."MASTER_NAMA_PPK", 'Tidak Diketahui') as nama_ppk, 
    COALESCE(m."UNIT KERJA", 
        (SELECT v."UNIT KERJA" FROM view_paket_penyedia_master_data v WHERE UPPER(v."SATUAN KERJA") = UPPER(mapped_e.nama_satker) AND v."UNIT KERJA" IS NOT NULL LIMIT 1),
        'Tidak Diketahui'
    ) as eselon1, 
    COALESCE(m."SATUAN KERJA", mapped_e.nama_satker, 'Tidak Diketahui') as satker,
    COALESCE(m.kd_klpd, mapped_e.kode_klpd) as kode_klpd,
    COALESCE(mapped_e.status, 'BELUM REALISASI') as status,
    COALESCE(mapped_e.total, 0) as total,
    mapped_e.kode_penyedia,
    mapped_e.order_id,
    m.status_kurasi,
    m.catatan_kurasi,
    m.rekomendasi_kurasi
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

-- 4. RECREATE TENDER
CREATE OR REPLACE VIEW view_dashboard_tender AS
WITH transaksional AS (
    SELECT kd_rup_paket as kd_rup, MAX(nama_penyedia) as nama_penyedia, MAX(kd_penyedia) as kode_penyedia,
        SUM(COALESCE(NULLIF(nilai_kontrak, 0), NULLIF(nilai_negosiasi, 0), NULLIF(nilai_terkoreksi, 0), NULLIF(nilai_penawaran, 0), NULLIF(hps, 0), 0)) as total
    FROM tender_selesai_nilai GROUP BY kd_rup_paket
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
LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup LEFT JOIN anggaran_penyedia pap_sum ON pap_sum.kd_rup = split_part(g.kd_rup, ';', 1);

-- 5. RECREATE PENUNJUKAN LANGSUNG
CREATE OR REPLACE VIEW view_dashboard_penunjukan_langsung AS
WITH pencatatan AS (
    SELECT kd_rup_paket, SUM(CAST(REPLACE(CAST(nilai_realisasi AS text), ',', '.') AS numeric)) as total, MAX(nama_penyedia) as nama_penyedia
    FROM pencatatan_non_tender_realisasi WHERE nilai_realisasi IS NOT NULL AND nilai_realisasi != '' GROUP BY kd_rup_paket
),
transaksional AS (
    SELECT kd_rup, SUM(CAST(REPLACE(COALESCE(NULLIF(nilai_kontrak, ''), NULLIF(nilai_negosiasi, ''), '0'), ',', '.') AS numeric)) as total,
        MAX(nama_penyedia) as nama_penyedia, MAX(nama_paket) as nama_paket, MAX(pagu) as pagu, MAX(nama_satker) as nama_satker, MAX(kd_satker_str) as kd_satker_str
    FROM non_tender_selesai WHERE mtd_pemilihan = 'Penunjukan Langsung' GROUP BY kd_rup
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
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup;

-- 6. RECREATE PENGADAAN LANGSUNG
CREATE OR REPLACE VIEW view_dashboard_pengadaan_langsung AS
WITH pencatatan AS (
    SELECT kd_rup_paket, SUM(CAST(REPLACE(CAST(nilai_realisasi AS text), ',', '.') AS numeric)) as total, MAX(nama_penyedia) as nama_penyedia
    FROM pencatatan_non_tender_realisasi WHERE nilai_realisasi IS NOT NULL AND nilai_realisasi != '' GROUP BY kd_rup_paket
),
transaksional AS (
    SELECT kd_rup, SUM(CAST(REPLACE(COALESCE(NULLIF(nilai_kontrak, ''), NULLIF(nilai_negosiasi, ''), '0'), ',', '.') AS numeric)) as total,
        MAX(nama_penyedia) as nama_penyedia, MAX(nama_paket) as nama_paket, MAX(pagu) as pagu, MAX(nama_satker) as nama_satker, MAX(kd_satker_str) as kd_satker_str
    FROM non_tender_selesai WHERE mtd_pemilihan IN ('Pengadaan Langsung', 'Dikecualikan') GROUP BY kd_rup
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
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup;

-- 7. RECREATE SWAKELOLA
CREATE OR REPLACE VIEW view_dashboard_swakelola_v1 AS
SELECT 
    COALESCE(m.kd_rup, e.kd_rup::bigint) as kd_rup, COALESCE(m.nama_paket, e.nama_paket) as rup_name, COALESCE(m.pagu, e.pagu, 0) as pagu, 
    m.tgl_pengumuman_paket, m.status_aktif_rup, COALESCE(m."MASTER_NAMA_PPK", m.nama_ppk, 'Tidak Diketahui') as nama_ppk,
    COALESCE(m."UNIT KERJA", (SELECT v."UNIT KERJA" FROM view_paket_swakelola_master_data v WHERE UPPER(v."SATUAN KERJA") = UPPER(e.nama_satker) AND v."UNIT KERJA" IS NOT NULL LIMIT 1), 'Tidak Diketahui') as eselon1, 
    COALESCE(m."SATUAN KERJA", e.nama_satker, 'Tidak Diketahui') as satker, COALESCE(m.kd_klpd, e.kd_klpd) as kode_klpd,
    COALESCE(e.status_swakelola_pct_ket, 'BELUM REALISASI') as status, COALESCE(e.total_realisasi, 0) as total,
    COALESCE(e.tipe_swakelola::text, m.tipe_swakelola::text) as tipe_swakelola, e.kd_swakelola_pct as order_id, '' as kode_penyedia,
    m.status_kurasi, m.catatan_kurasi, m.rekomendasi_kurasi
FROM view_paket_swakelola_master_data m
FULL OUTER JOIN api_pencatatan_swakelola e ON m.kd_rup::text = e.kd_rup::text
WHERE (e.status_swakelola_pct_ket NOT ILIKE '%cancel%' OR e.status_swakelola_pct_ket IS NULL);

-- 8. RECREATE GABUNGAN SATKER
CREATE OR REPLACE VIEW view_dashboard_gabungan_satker AS
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'E-Purchasing' AS metode_pengadaan
FROM view_dashboard_epurchasing_v6
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, metode_pengadaan
FROM view_dashboard_pengadaan_langsung
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'Penunjukan Langsung' AS metode_pengadaan
FROM view_dashboard_penunjukan_langsung
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, metode_pengadaan
FROM view_dashboard_tender
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'Swakelola' AS metode_pengadaan
FROM view_dashboard_swakelola_v1;
