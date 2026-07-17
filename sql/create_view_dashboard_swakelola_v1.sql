CREATE OR REPLACE VIEW view_dashboard_swakelola_v1 AS
SELECT 
    COALESCE(m.kd_rup, e.kd_rup::bigint) as kd_rup, 
    COALESCE(m.nama_paket, e.nama_paket) as rup_name,
    COALESCE(m.pagu, e.pagu, 0) as pagu, 
    m.tgl_pengumuman_paket, 
    m.status_aktif_rup, 
    COALESCE(m."MASTER_NAMA_PPK", m.nama_ppk, 'Tidak Diketahui') as nama_ppk,
    COALESCE(m."UNIT KERJA", 
        (SELECT v."UNIT KERJA" FROM view_paket_swakelola_master_data v WHERE UPPER(v."SATUAN KERJA") = UPPER(e.nama_satker) AND v."UNIT KERJA" IS NOT NULL LIMIT 1),
        'Tidak Diketahui'
    ) as eselon1, 
    COALESCE(m."SATUAN KERJA", e.nama_satker, 'Tidak Diketahui') as satker,
    COALESCE(m.kd_klpd, e.kd_klpd) as kode_klpd,
    
    COALESCE(e.status_swakelola_pct_ket, 'BELUM REALISASI') as status,
    COALESCE(e.total_realisasi, 0) as total,
    COALESCE(e.tipe_swakelola::text, m.tipe_swakelola::text) as tipe_swakelola,
    e.kd_swakelola_pct as order_id,
    '' as kode_penyedia
FROM view_paket_swakelola_master_data m
FULL OUTER JOIN api_pencatatan_swakelola e ON m.kd_rup::text = e.kd_rup::text
WHERE (e.status_swakelola_pct_ket NOT ILIKE '%cancel%' OR e.status_swakelola_pct_ket IS NULL);
