-- Hindari timeout saat pembuatan Materialized View (set menjadi 10 menit atau 0 untuk unlimited)
SET statement_timeout = '10min';

-- Drop as a materialized view (if it was created as a materialized view previously)
DROP MATERIALIZED VIEW IF EXISTS view_prioritas_nasional CASCADE;
-- Then drop as a normal view (if it was created as a normal view)
DROP VIEW IF EXISTS view_prioritas_nasional CASCADE;

CREATE MATERIALIZED VIEW view_prioritas_nasional AS
SELECT 
    ro.id,
    ro."No",
    ro."Kode/ID paket" AS kode_rup,
    ro."Nama paket" AS nama_paket_ro,
    ro."Nilai Paket (Rp)"::numeric AS pagu_ro,
    ro."Skema (tender/e-purchasing/katalog/lainnya)" AS skema_ro,
    ro."RO",
    
    -- === 1. Detail Kepemilikan Paket (Hierarki dari master_data) ===
    -- Menggunakan COALESCE agar jika cocok di master_data, gunakan nama aslinya; jika tidak, gunakan dari RUP
    COALESCE(md."SATKER", penyedia.nama_satker, swakelola.nama_satker) AS nama_satker,
    COALESCE(md."NAMA PPK", penyedia.nama_ppk, swakelola.nama_ppk) AS nama_ppk,
    COALESCE(penyedia.kd_satker, swakelola.kd_satker) AS kd_satker,
    COALESCE(md."UNIT KERJA", swa.eselon1, ep.eselon1, pl.eselon1, pnl.eselon1) AS eselon1, 

    -- === Tambahan: Kode PPK aslinya ===
    COALESCE(penyedia.nama_ppk, swakelola.nama_ppk) AS kode_ppk,
    
    -- === Tambahan: Metode Pemilihan ===
    COALESCE(penyedia.metode_pengadaan, 'Swakelola Tipe ' || swakelola.tipe_swakelola::text) AS metode_pemilihan,

    -- === 2. Total Realisasi ===
    COALESCE(swa.total, 0) AS realisasi_swakelola,
    COALESCE(ep.total, 0) AS realisasi_epurchasing,
    COALESCE(pl.total, 0) AS realisasi_pengadaan_langsung,
    COALESCE(pnl.total, 0) AS realisasi_penunjukan_langsung,
    
    -- Total Realisasi Keseluruhan per Paket
    (
        COALESCE(swa.total, 0) + 
        COALESCE(ep.total, 0) + 
        COALESCE(pl.total, 0) + 
        COALESCE(pnl.total, 0)
    ) AS total_realisasi

FROM 
    master_data_ro ro

-- JOIN Data RUP Utama untuk mendapatkan kode PPK (nama tersensor)
LEFT JOIN api_paket_penyedia_terumumkan penyedia 
    ON ro."Kode/ID paket" = penyedia.kd_rup
LEFT JOIN api_paket_swakelola_terumumkan swakelola 
    ON ro."Kode/ID paket" = swakelola.kd_rup

-- JOIN master_data untuk mendapatkan NAMA PPK asli, Satker, dan Eselon 1 berdasarkan Kode PPK
LEFT JOIN master_data md
    ON COALESCE(penyedia.nama_ppk, swakelola.nama_ppk) = md."KODE PPK"

-- JOIN View Dashboard untuk Nilai Realisasi
LEFT JOIN view_dashboard_swakelola_v1 swa 
    ON ro."Kode/ID paket" = swa.kd_rup
LEFT JOIN view_dashboard_epurchasing_v6 ep 
    ON ro."Kode/ID paket" = ep.kd_rup
LEFT JOIN view_dashboard_pengadaan_langsung pl 
    ON ro."Kode/ID paket"::text = pl.kd_rup
LEFT JOIN view_dashboard_penunjukan_langsung pnl 
    ON ro."Kode/ID paket"::text = pnl.kd_rup;

-- Berikan akses ke API Supabase (anon & authenticated roles)
GRANT SELECT ON view_prioritas_nasional TO anon, authenticated;
