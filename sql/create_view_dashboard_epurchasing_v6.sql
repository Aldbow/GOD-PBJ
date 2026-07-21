CREATE OR REPLACE VIEW view_dashboard_epurchasing_v6 AS
SELECT 
    COALESCE(m.kd_rup, e.rup_code::bigint) as kd_rup, 
    COALESCE(m.nama_paket, e.rup_name) as rup_name,
    COALESCE(m.pagu, 0) as pagu, 
    m.tgl_pengumuman_paket, 
    m.status_aktif_rup, 
    COALESCE(m."MASTER_NAMA_PPK", m.nama_ppk, 'Tidak Diketahui') as nama_ppk,
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
WHERE (e.status NOT ILIKE '%cancel%' OR e.status IS NULL)
  -- Tanpa ini, FULL OUTER JOIN menyeret SEMUA RUP di master data (apapun metode
  -- aslinya) ke sisi "belum ada transaksi e-purchasing" dan melabelnya E-Purchasing,
  -- sehingga paket non-e-purchasing (mis. Pengadaan Langsung) ikut duplikat &
  -- salah label di view_dashboard_gabungan_satker.
  AND (e.rup_code IS NOT NULL OR m.metode_pengadaan = 'E-Purchasing');
