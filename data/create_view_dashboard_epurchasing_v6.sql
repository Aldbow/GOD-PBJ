-- Hindari timeout saat pembuatan Materialized View
SET statement_timeout = '10min';

DO $$
BEGIN
    DROP VIEW IF EXISTS view_dashboard_epurchasing_v6 CASCADE;
EXCEPTION WHEN wrong_object_type THEN
    DROP MATERIALIZED VIEW IF EXISTS view_dashboard_epurchasing_v6 CASCADE;
END $$;

CREATE MATERIALIZED VIEW view_dashboard_epurchasing_v6 AS
SELECT 
    COALESCE(m.kd_rup, e.rup_code::bigint) as kd_rup, 
    COALESCE(m.nama_paket, e.rup_name) as rup_name,
    COALESCE(m.pagu, 0) as pagu, 
    m.tgl_pengumuman_paket, 
    m.status_aktif_rup, 
    COALESCE(m."MASTER_NAMA_PPK", 'Tidak Diketahui') as nama_ppk, 
    COALESCE(m."UNIT KERJA", 
        (SELECT v."UNIT KERJA" FROM view_paket_penyedia_master_data v WHERE UPPER(v."SATUAN KERJA") = UPPER(e.nama_satker) AND v."UNIT KERJA" IS NOT NULL LIMIT 1),
        'Tidak Diketahui'
    ) as eselon1, 
    COALESCE(m."SATUAN KERJA", e.nama_satker, 'Tidak Diketahui') as satker,
    COALESCE(m.kd_klpd, e.kode_klpd) as kode_klpd,
    
    COALESCE(e.status, 'BELUM REALISASI') as status,
    COALESCE(e.total, 0) as total,
    e.kode_penyedia,
    e.order_id
FROM view_paket_penyedia_master_data m
FULL OUTER JOIN paket_e_purchasing e ON m.kd_rup::text = e.rup_code::text
WHERE (e.status NOT ILIKE '%cancel%' OR e.status IS NULL);

-- Berikan akses ke API Supabase (anon & authenticated roles)
GRANT SELECT ON view_dashboard_epurchasing_v6 TO anon, authenticated;
