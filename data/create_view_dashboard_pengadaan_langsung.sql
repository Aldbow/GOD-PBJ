-- Hapus view yang lama terlebih dahulu agar tidak terjadi error bentrok kolom
DROP VIEW IF EXISTS view_dashboard_pengadaan_langsung;

CREATE OR REPLACE VIEW view_dashboard_pengadaan_langsung AS
SELECT 
    pl.kd_rup,
    pl.nama_paket AS rup_name,
    pl.pagu,
    COALESCE(SUM(CAST(r.nilai_realisasi AS numeric)), 0) AS total,
    pl.nama_ppk,
    pl.nama_satker AS satker,
    -- Mengambil UNIT KERJA dari master_data berdasarkan kd_satker_str
    (SELECT m."UNIT KERJA" FROM master_data m WHERE m."KODE SATKER_str" = CAST(pl.kd_satker_str AS text) AND m."UNIT KERJA" IS NOT NULL LIMIT 1) AS eselon1,
    pl.status_aktif_rup,
    MAX(r.nama_penyedia) AS kode_penyedia,
    CASE 
        WHEN COALESCE(SUM(CAST(r.nilai_realisasi AS numeric)), 0) > 0 THEN 'COMPLETED'
        ELSE 'BELUM REALISASI'
    END AS status
FROM 
    view_api_paket_pengadaan_langsung pl
LEFT JOIN 
    pencatatan_non_tender_realisasi r ON CAST(pl.kd_rup AS text) = r.kd_rup_paket
GROUP BY 
    pl.kd_rup, pl.nama_paket, pl.pagu, pl.nama_ppk, pl.nama_satker, pl.kd_satker_str, pl.status_aktif_rup;
