-- Hapus view yang lama terlebih dahulu agar tidak terjadi error bentrok kolom
DROP VIEW IF EXISTS view_dashboard_pengadaan_langsung;

CREATE OR REPLACE VIEW view_dashboard_pengadaan_langsung AS
WITH pencatatan AS (
    SELECT 
        kd_rup_paket, 
        SUM(CAST(REPLACE(CAST(nilai_realisasi AS text), ',', '.') AS numeric)) as total
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
        ) as total
    FROM non_tender_selesai
    GROUP BY kd_rup
)
SELECT 
    pl.kd_rup,
    pl.nama_paket AS rup_name,
    pl.pagu,
    
    -- Pemecahan Nilai Realisasi
    COALESCE(p.total, 0) AS total_pencatatan,
    COALESCE(t.total, 0) AS total_transaksional,
    (COALESCE(p.total, 0) + COALESCE(t.total, 0)) AS total,
    
    pl.nama_ppk,
    pl.nama_satker AS satker,
    (SELECT m."UNIT KERJA" FROM master_data m WHERE m."KODE SATKER_str" = CAST(pl.kd_satker_str AS text) AND m."UNIT KERJA" IS NOT NULL LIMIT 1) AS eselon1,
    pl.status_aktif_rup,
    
    -- Penarikan Nama Penyedia (Diambil dari Transaksional jika ada, jika tidak dari Pencatatan)
    COALESCE(
       (SELECT MAX(nama_penyedia) FROM non_tender_selesai nts WHERE nts.kd_rup = CAST(pl.kd_rup AS text)),
       (SELECT MAX(nama_penyedia) FROM pencatatan_non_tender_realisasi r WHERE r.kd_rup_paket = CAST(pl.kd_rup AS text))
    ) AS kode_penyedia,
    
    CASE 
        WHEN (COALESCE(p.total, 0) + COALESCE(t.total, 0)) > 0 THEN 'COMPLETED'
        ELSE 'BELUM REALISASI'
    END AS status
FROM 
    view_api_paket_pengadaan_langsung pl
LEFT JOIN pencatatan p ON p.kd_rup_paket = CAST(pl.kd_rup AS text)
LEFT JOIN transaksional t ON t.kd_rup = CAST(pl.kd_rup AS text);
