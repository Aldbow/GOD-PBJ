-- ============================================================================
-- Menambahkan kolom is_from_sirup ke view E-Purchasing, Swakelola, dan gabungan
-- ----------------------------------------------------------------------------
-- Tujuan: mendukung deteksi anomali "Realisasi tanpa RUP terumumkan".
--   is_from_sirup = true  -> RUP ketemu di SIRUP penyedia/swakelola master
--   is_from_sirup = false -> baris realisasi tanpa pasangan RUP terumumkan
--
-- View Tender/Pengadaan Langsung/Penunjukan Langsung SUDAH punya kolom ini.
-- Di sini ditambahkan untuk E-Purchasing & Swakelola (sisi master = alias m),
-- lalu diteruskan ke view_dashboard_gabungan_satker.
--
-- CATATAN: kolom baru ditambahkan DI AKHIR agar CREATE OR REPLACE VIEW valid
-- dan view dependen tetap sah. Jalankan di Supabase SQL Editor (urut atas->bawah).
-- ============================================================================

-- 1. E-PURCHASING -----------------------------------------------------------
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
    m.rekomendasi_kurasi,
    CASE WHEN m.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup
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

-- 2. SWAKELOLA --------------------------------------------------------------
CREATE OR REPLACE VIEW view_dashboard_swakelola_v1 AS
SELECT
    COALESCE(m.kd_rup, e.kd_rup::bigint) as kd_rup, COALESCE(m.nama_paket, e.nama_paket) as rup_name, COALESCE(m.pagu, e.pagu, 0) as pagu,
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

-- 3. GABUNGAN SATKER --------------------------------------------------------
-- Teruskan is_from_sirup dari tiap sub-view (semua sub-view kini memilikinya).
CREATE OR REPLACE VIEW view_dashboard_gabungan_satker AS
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'E-Purchasing' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup
FROM view_dashboard_epurchasing_v6
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup
FROM view_dashboard_pengadaan_langsung
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'Penunjukan Langsung' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup
FROM view_dashboard_penunjukan_langsung
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup
FROM view_dashboard_tender
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'Swakelola' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup
FROM view_dashboard_swakelola_v1;
