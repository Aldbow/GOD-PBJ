-- Script untuk menggabungkan (join) tabel api_paket_swakelola_terumumkan dengan master_data
-- Diperbarui dengan DISTINCT ON untuk menghindari duplikasi data akibat 1 Satker memiliki banyak PPK

CREATE OR REPLACE VIEW view_paket_swakelola_master_data AS
SELECT DISTINCT ON (p.kd_rup)
    p.*,
    m."NO",
    m."SATUAN KERJA",
    m."SATKER",
    m."KPA",
    m."KODE UNIT",
    m."UNIT KERJA",
    m."WILAYAH",
    m."KODE PPK",
    m."NAMA PPK" AS "MASTER_NAMA_PPK",
    m."NIP PPK" AS "MASTER_NIP_PPK"
FROM 
    api_paket_swakelola_terumumkan p
LEFT JOIN 
    master_data m
ON 
    p.kd_satker_str::text = m."KODE SATKER_str" 
    AND p.nama_ppk = m."KODE PPK"
ORDER BY 
    p.kd_rup;
