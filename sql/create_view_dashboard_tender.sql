/* Hapus view yang lama terlebih dahulu agar tidak terjadi error bentrok kolom */
DROP VIEW IF EXISTS view_dashboard_tender;

CREATE OR REPLACE VIEW view_dashboard_tender AS
WITH transaksional AS (
    SELECT 
        kd_rup_paket as kd_rup, 
        MAX(nama_penyedia) as nama_penyedia,
        MAX(kd_penyedia) as kode_penyedia,
        SUM(
            COALESCE(
                NULLIF(nilai_kontrak, 0),
                NULLIF(nilai_negosiasi, 0),
                NULLIF(nilai_terkoreksi, 0),
                NULLIF(nilai_penawaran, 0),
                NULLIF(hps, 0),
                0
            )
        ) as total
    FROM tender_selesai_nilai
    GROUP BY kd_rup_paket
),
-- Ambil pagu dari tabel anggaran penyedia dan aplikasikan logika Kontrak Tahun Jamak
anggaran_penyedia AS (
    SELECT 
        CAST(utama.kd_rup AS text) as kd_rup, 
        SUM(
            CASE 
                WHEN utama.tahun_anggaran_dana = '2026' THEN utama.pagu
                WHEN utama.tahun_anggaran_dana = '2027' THEN (COALESCE(pendukung.pagu, 0) - COALESCE(utama.pagu, 0))
                ELSE utama.pagu 
            END
        ) as pagu 
    FROM paket_anggaran_penyedia utama
    LEFT JOIN api_paket_penyedia_terumumkan pendukung ON utama.kd_rup = pendukung.kd_rup
    GROUP BY utama.kd_rup
),
gabungan_rup AS (
    -- Koneksikan anggaran dengan data master (yang memuat info metode_pengadaan dari terumumkan)
    SELECT pap.kd_rup 
    FROM anggaran_penyedia pap
    JOIN view_paket_penyedia_master_data v ON CAST(v.kd_rup AS text) = pap.kd_rup
    WHERE v.metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')
    UNION
    SELECT kd_rup FROM transaksional
)
SELECT 
    g.kd_rup,
    COALESCE(pl.nama_paket, 'Paket Tidak Diketahui') AS rup_name,
    COALESCE(pap_sum.pagu, 0) AS pagu,
    
    COALESCE(t.total, 0) AS total,
    
    /* Utamakan nama PPK asli dari master (unmasking); fallback ke nama_ppk SIRUP */
    COALESCE(pl."MASTER_NAMA_PPK", pl.nama_ppk, 'Anomali/Tidak Diketahui') AS nama_ppk,
    /* Utamakan Biro (SATUAN KERJA) dari master; fallback ke nama_satker SIRUP */
    COALESCE(pl."SATUAN KERJA", pl.nama_satker, 'Satker Tidak Diketahui') AS satker,
    /* Eselon-1 diambil dari base view */
    COALESCE(
        pl."UNIT KERJA",
        (SELECT m."UNIT KERJA" FROM master_data m WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(CAST(pl.kd_satker_str AS text), '0') AND m."UNIT KERJA" IS NOT NULL LIMIT 1)
    ) AS eselon1,
    pl.status_aktif_rup,
    
    COALESCE(t.nama_penyedia, t.kode_penyedia) AS kode_penyedia,
    
    /* Menambahkan penanda boolean Multiple RUP */
    CASE WHEN g.kd_rup LIKE '%;%' THEN true ELSE false END AS is_multiple_rup,
    
    /* Penanda apakah RUP ini berasal dari SIRUP (tabel kiri) */
    CASE WHEN pl.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    
    /* Ekspos metode pengadaan asli agar bisa dibedakan di UI */
    COALESCE(pl.metode_pengadaan, 'Tidak Diketahui') AS metode_pengadaan,
    
    CASE 
        WHEN COALESCE(t.total, 0) > 0 THEN 'COMPLETED'
        ELSE 'BELUM REALISASI'
    END AS status,
    
    pl.status_kurasi,
    pl.catatan_kurasi,
    pl.rekomendasi_kurasi
FROM gabungan_rup g
LEFT JOIN (
    SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')
) pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup
LEFT JOIN anggaran_penyedia pap_sum ON pap_sum.kd_rup = split_part(g.kd_rup, ';', 1);
