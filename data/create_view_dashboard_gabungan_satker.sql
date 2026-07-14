-- Hindari timeout saat pembuatan Materialized View
SET statement_timeout = '10min';

DO $$
BEGIN
    DROP VIEW IF EXISTS view_dashboard_gabungan_satker CASCADE;
EXCEPTION WHEN wrong_object_type THEN
    DROP MATERIALIZED VIEW IF EXISTS view_dashboard_gabungan_satker CASCADE;
END $$;

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
FROM view_dashboard_penunjukan_langsung

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
    'Swakelola' AS metode_pengadaan
FROM view_dashboard_swakelola_v1;

-- Berikan akses ke API Supabase (anon & authenticated roles)
GRANT SELECT ON view_dashboard_gabungan_satker TO anon, authenticated;
