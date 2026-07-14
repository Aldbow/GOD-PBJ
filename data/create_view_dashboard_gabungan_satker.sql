-- Hapus view yang lama (jika ada)
DROP MATERIALIZED VIEW IF EXISTS view_dashboard_gabungan_satker CASCADE;
DROP VIEW IF EXISTS view_dashboard_gabungan_satker CASCADE;

CREATE MATERIALIZED VIEW view_dashboard_gabungan_satker AS
SELECT 
    CAST(kd_rup AS TEXT) as kd_rup,
    rup_name,
    pagu,
    total,
    status,
    nama_ppk,
    status_aktif_rup,
    satker,
    'E-Purchasing' AS metode_pengadaan
FROM view_dashboard_epurchasing_v6

UNION ALL

SELECT 
    CAST(kd_rup AS TEXT) as kd_rup,
    rup_name,
    pagu,
    total,
    status,
    nama_ppk,
    status_aktif_rup,
    satker,
    metode_pengadaan
FROM view_dashboard_pengadaan_langsung

UNION ALL

SELECT 
    CAST(kd_rup AS TEXT) as kd_rup,
    rup_name,
    pagu,
    total,
    status,
    nama_ppk,
    status_aktif_rup,
    satker,
    'Penunjukan Langsung' AS metode_pengadaan
FROM view_dashboard_penunjukan_langsung;

-- Berikan akses ke API Supabase (anon & authenticated roles)
GRANT SELECT ON view_dashboard_gabungan_satker TO anon, authenticated;
