DROP VIEW IF EXISTS view_dashboard_keterisian_sirup_eselon1;

CREATE OR REPLACE VIEW view_dashboard_keterisian_sirup_eselon1 AS
WITH satker_mapping AS (
    SELECT 
        d.total_rup, 
        d.belanja_pengadaan,
        d.total_perencanaan_penyedia,
        d.total_perencanaan_swakelola,
        d.barang,
        d.pekerjaan_konstruksi,
        d.jasa_konsultasi,
        d.jasa_lainnya,
        d.terintegrasi_gabungan,
        d.tender_seleksi,
        d.epurchasing,
        d.pengadaan_langsung,
        d.penunjukan_langsung,
        d.metode_lainnya,
        (
            SELECT m."UNIT KERJA"
            FROM master_data m
            WHERE UPPER(TRIM(m."SATUAN KERJA")) = UPPER(TRIM(d.nama_satuan_kerja)) 
               OR UPPER(TRIM(m."SATKER")) = UPPER(TRIM(d.nama_satuan_kerja))
               OR UPPER(TRIM(m."KPA")) = UPPER(TRIM(d.nama_satuan_kerja))
            LIMIT 1
        ) AS eselon1
    FROM data_afirmasi_pdn_perencanaan d
),
mapped AS (
    SELECT 
        total_rup,
        belanja_pengadaan,
        total_perencanaan_penyedia,
        total_perencanaan_swakelola,
        barang,
        pekerjaan_konstruksi,
        jasa_konsultasi,
        jasa_lainnya,
        terintegrasi_gabungan,
        tender_seleksi,
        epurchasing,
        pengadaan_langsung,
        penunjukan_langsung,
        metode_lainnya,
        COALESCE(eselon1, 'Anomali / Eselon I Tidak Diketahui') AS eselon1
    FROM satker_mapping
)
SELECT 
    eselon1 as nama_eselon1,
    SUM(COALESCE(total_rup, 0)) as total_rup,
    SUM(COALESCE(belanja_pengadaan, 0)) as belanja_pengadaan,
    SUM(COALESCE(total_perencanaan_penyedia, 0)) as total_perencanaan_penyedia,
    SUM(COALESCE(total_perencanaan_swakelola, 0)) as total_perencanaan_swakelola,
    SUM(COALESCE(barang, 0)) as barang,
    SUM(COALESCE(pekerjaan_konstruksi, 0)) as pekerjaan_konstruksi,
    SUM(COALESCE(jasa_konsultasi, 0)) as jasa_konsultasi,
    SUM(COALESCE(jasa_lainnya, 0)) as jasa_lainnya,
    SUM(COALESCE(terintegrasi_gabungan, 0)) as terintegrasi_gabungan,
    SUM(COALESCE(tender_seleksi, 0)) as tender_seleksi,
    SUM(COALESCE(epurchasing, 0)) as epurchasing,
    SUM(COALESCE(pengadaan_langsung, 0)) as pengadaan_langsung,
    SUM(COALESCE(penunjukan_langsung, 0)) as penunjukan_langsung,
    SUM(COALESCE(metode_lainnya, 0)) as metode_lainnya
FROM mapped
GROUP BY eselon1;
