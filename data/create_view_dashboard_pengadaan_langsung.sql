-- Hapus view yang lama terlebih dahulu agar tidak terjadi error bentrok kolom
DROP VIEW IF EXISTS view_dashboard_pengadaan_langsung;

CREATE OR REPLACE VIEW view_dashboard_pengadaan_langsung AS
WITH pencatatan AS (
    SELECT 
        kd_rup_paket, 
        SUM(CAST(REPLACE(CAST(nilai_realisasi AS text), ',', '.') AS numeric)) as total,
        MAX(nama_penyedia) as nama_penyedia
    FROM pencatatan_non_tender_realisasi
    WHERE nilai_realisasi IS NOT NULL AND nilai_realisasi != ''
    GROUP BY kd_rup_paket
),
transaksional AS (
    SELECT 
        kd_rup, 
        SUM(
            CAST(
                REPLACE(
                    COALESCE(NULLIF(nilai_kontrak, ''), NULLIF(nilai_negosiasi, ''), '0'), 
                    ',', '.'
                ) AS numeric
            )
        ) as total,
        MAX(nama_penyedia) as nama_penyedia,
        MAX(nama_paket) as nama_paket,
        MAX(pagu) as pagu,
        MAX(nama_satker) as nama_satker,
        MAX(kd_satker_str) as kd_satker_str
    FROM non_tender_selesai
    WHERE mtd_pemilihan = 'Pengadaan Langsung'
    GROUP BY kd_rup
),
gabungan_rup AS (
    SELECT CAST(kd_rup AS text) as kd_rup FROM view_api_paket_pengadaan_langsung
    UNION
    SELECT kd_rup FROM transaksional
)
SELECT 
    g.kd_rup,
    COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name,
    COALESCE(pl.pagu, CAST(NULLIF(t.pagu, '') AS numeric), 0) AS pagu,
    
    COALESCE(p.total, 0) AS total_pencatatan,
    COALESCE(t.total, 0) AS total_transaksional,
    (COALESCE(p.total, 0) + COALESCE(t.total, 0)) AS total,
    
    COALESCE(pl.nama_ppk, 'Anomali/Tidak Diketahui') AS nama_ppk,
    COALESCE(pl.nama_satker, t.nama_satker, 'Satker Tidak Diketahui') AS satker,
    (SELECT m."UNIT KERJA" FROM master_data m WHERE m."KODE SATKER_str" = COALESCE(CAST(pl.kd_satker_str AS text), t.kd_satker_str) AND m."UNIT KERJA" IS NOT NULL LIMIT 1) AS eselon1,
    pl.status_aktif_rup,
    
    COALESCE(t.nama_penyedia, p.nama_penyedia) AS kode_penyedia,
    
    CASE 
        WHEN (COALESCE(p.total, 0) + COALESCE(t.total, 0)) > 0 THEN 'COMPLETED'
        ELSE 'BELUM REALISASI'
    END AS status
FROM gabungan_rup g
LEFT JOIN view_api_paket_pengadaan_langsung pl ON CAST(pl.kd_rup AS text) = g.kd_rup
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup
LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup;
