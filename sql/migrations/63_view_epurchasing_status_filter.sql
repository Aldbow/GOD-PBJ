-- Perbaikan filter status realisasi E-Purchasing: definisi lama hanya exclude
-- status yang mengandung 'cancel', sehingga status transisi lain (ON_NEGOTIATION,
-- WAITING_PPK_REVIEW, WAITING_SELLER_CONFIRMATION, dst) ikut lolos ke Total
-- Realisasi E-Purchasing (baik di halaman E-Purchasing maupun Ringkasan via
-- view_dashboard_gabungan_satker). Realisasi E-Purchasing seharusnya hanya
-- menghitung baris paket_e_purchasing dengan status: ON_PROCESS, ON_ADDENDUM,
-- COMPLETED, PAYMENT_OUTSIDE_SYSTEM.
--
-- Basis definisi = 45_view_jenis_pengadaan.sql (definisi TERKINI yang ter-deploy,
-- sudah termasuk kolom jenis_pengadaan di akhir). Basis sebelumnya (44_view_epurchasing_final.sql)
-- SUDAH KETINGGALAN -- tidak punya kolom jenis_pengadaan, sehingga CREATE OR REPLACE
-- dengannya gagal dengan "cannot drop columns from view". Kolom output di sini
-- sama persis dengan 45 (urutan & jumlah tidak berubah) -> CREATE OR REPLACE tetap
-- valid & view dependen (view_dashboard_gabungan_satker) tetap sah. Hanya WHERE
-- clause di subquery mapped_e yang berubah.
CREATE OR REPLACE VIEW view_dashboard_epurchasing_v6 AS
SELECT
    COALESCE(m.kd_rup, mapped_e.resolved_rup) as kd_rup,
    COALESCE(m.nama_paket, mapped_e.rup_name) as rup_name,
    COALESCE(m.pagu, 0) as pagu,
    m.tgl_pengumuman_paket,
    m.status_aktif_rup,
    COALESCE(m."MASTER_NAMA_PPK", 'Tidak Diketahui') as nama_ppk,
    COALESCE(m."UNIT KERJA",
        (SELECT m3."UNIT KERJA" FROM master_data m3 WHERE LTRIM(m3."KODE SATKER_str", '0') = LTRIM(mapped_e.kode_satker, '0') AND m3."UNIT KERJA" IS NOT NULL LIMIT 1),
        (SELECT m2."UNIT KERJA"
           FROM satker_kode_alias a
           JOIN master_data m2 ON LTRIM(m2."KODE SATKER_str", '0') = LTRIM(a.kode_master, '0')
          WHERE LTRIM(a.kode_alias, '0') = LTRIM(mapped_e.kode_satker, '0')
            AND m2."UNIT KERJA" IS NOT NULL
          LIMIT 1),
        (SELECT v."UNIT KERJA" FROM view_paket_penyedia_master_data v WHERE UPPER(v."SATUAN KERJA") = UPPER(mapped_e.nama_satker) AND v."UNIT KERJA" IS NOT NULL LIMIT 1),
        'Tidak Diketahui'
    ) as eselon1,
    COALESCE(m."SATUAN KERJA",
        (SELECT a.satuan_kerja FROM satker_kode_alias a WHERE LTRIM(a.kode_alias, '0') = LTRIM(mapped_e.kode_satker, '0') AND a.satuan_kerja IS NOT NULL LIMIT 1),
        NULLIF(m.nama_satker, ''),
        NULLIF(m."KPA", ''),
        (SELECT m3."KPA" FROM master_data m3 WHERE LTRIM(m3."KODE SATKER_str", '0') = LTRIM(mapped_e.kode_satker, '0') AND m3."KPA" IS NOT NULL LIMIT 1),
        mapped_e.nama_satker,
        'Tidak Diketahui'
    ) as satker,
    COALESCE(m.kd_klpd, mapped_e.kode_klpd) as kode_klpd,
    COALESCE(mapped_e.status, 'BELUM REALISASI') as status,
    COALESCE(mapped_e.total, 0) as total,
    mapped_e.kode_penyedia,
    mapped_e.order_id,
    m.status_kurasi,
    m.catatan_kurasi,
    m.rekomendasi_kurasi,
    CASE WHEN m.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    m.jenis_pengadaan
FROM (
    SELECT *
    FROM view_paket_penyedia_master_data
    WHERE metode_pengadaan = 'E-Purchasing'
) m
FULL OUTER JOIN (
    SELECT
        COALESCE(rf.final_rup, e.rup_code::bigint) as resolved_rup,
        MAX(e.rup_name) as rup_name,
        MAX(e.nama_satker) as nama_satker,
        MAX(e.kode_satker) as kode_satker,
        MAX(e.kode_klpd) as kode_klpd,
        MAX(e.status) as status,
        SUM(e.total) as total,
        STRING_AGG(DISTINCT e.kode_penyedia, ', ') as kode_penyedia,
        STRING_AGG(DISTINCT e.order_id, ', ') as order_id
    FROM paket_e_purchasing e
    LEFT JOIN view_rup_final rf ON e.rup_code::bigint = rf.origin_rup
    WHERE e.status IN ('ON_PROCESS', 'ON_ADDENDUM', 'COMPLETED', 'PAYMENT_OUTSIDE_SYSTEM')
    GROUP BY COALESCE(rf.final_rup, e.rup_code::bigint)
) mapped_e ON m.kd_rup = mapped_e.resolved_rup
WHERE COALESCE(m.kd_rup, mapped_e.resolved_rup) NOT IN (
      SELECT kd_rup_lama
      FROM history_kaji_ulang
      WHERE kd_rup_lama <> kd_rup_baru
  );
