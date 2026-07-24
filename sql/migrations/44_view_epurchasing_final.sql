-- PRASYARAT: jalankan create_satker_kode_alias.sql lebih dulu (view ini memakai
-- tabel crosswalk satker_kode_alias untuk fallback eselon1/satker berbasis kode
-- pada paket E-Purchasing yang tidak punya RUP di master).
--
-- CATATAN: definisi ini = definisi terkini yang ter-deploy (add_is_from_sirup_flags.sql:
-- pakai mapped_e via view_rup_final, kolom is_from_sirup di akhir, exclude
-- history_kaji_ulang), DITAMBAH fallback ALIAS berbasis kode_satker. Kolom output
-- (nama/urutan/tipe) TIDAK berubah -> CREATE OR REPLACE tetap valid & view dependen
-- (view_dashboard_gabungan_satker) tetap sah.
CREATE OR REPLACE VIEW view_dashboard_epurchasing_v6 AS
SELECT
    COALESCE(m.kd_rup, mapped_e.resolved_rup) as kd_rup,
    COALESCE(m.nama_paket, mapped_e.rup_name) as rup_name,
    COALESCE(m.pagu, 0) as pagu,
    m.tgl_pengumuman_paket,
    m.status_aktif_rup,
    COALESCE(m."MASTER_NAMA_PPK", 'Tidak Diketahui') as nama_ppk,
    /* eselon1: (1) master via kd_rup; (2) DIRECT via kode_satker yang sah di
       master (menutup paket E-Purchasing-only tanpa RUP, mis. kode 450938/451270);
       (3) via crosswalk ALIAS (kode berbeda: 450922->450938, 451310->451270);
       (4) fallback lama via nama; (5) 'Tidak Diketahui'. UNIT KERJA konstan per
       KODE SATKER_str sehingga resolusi lewat kode aman & deterministik.
       LTRIM('0') di kedua sisi -> tahan beda leading-zero. */
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
    /* satker: (1) master biro (di-gate PPK); (2) nama kanonik crosswalk alias;
       (3) m.nama_satker = nama satker RUP dari SIRUP (UNGATED, paling spesifik)
           -> menutup Celah 1: saat PPK tak match, "SATUAN KERJA" NULL walau kode
           satker jelas (mis. 44 paket Balai Vokasi/BINALAVOTAS); (4) m."KPA" =
           nama level-KPA dari master (ungated); (5) nama mentah E-Purchasing;
           (6) 'Tidak Diketahui'. */
    COALESCE(m."SATUAN KERJA",
        (SELECT a.satuan_kerja FROM satker_kode_alias a WHERE LTRIM(a.kode_alias, '0') = LTRIM(mapped_e.kode_satker, '0') AND a.satuan_kerja IS NOT NULL LIMIT 1),
        NULLIF(m.nama_satker, ''),
        NULLIF(m."KPA", ''),
        /* DIRECT via kode_satker sah di master: nama level-KPA utk paket
           E-Purchasing-only tanpa RUP (mis. kode 450938 -> 'Sekretariat Jenderal') */
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
    CASE WHEN m.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup
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
        MAX(e.kode_satker) as kode_satker,   -- dibutuhkan utk fallback ALIAS berbasis kode
        MAX(e.kode_klpd) as kode_klpd,
        MAX(e.status) as status,
        SUM(e.total) as total,
        STRING_AGG(DISTINCT e.kode_penyedia, ', ') as kode_penyedia,
        STRING_AGG(DISTINCT e.order_id, ', ') as order_id
    FROM paket_e_purchasing e
    LEFT JOIN view_rup_final rf ON e.rup_code::bigint = rf.origin_rup
    WHERE (e.status NOT ILIKE '%cancel%' OR e.status IS NULL)
    GROUP BY COALESCE(rf.final_rup, e.rup_code::bigint)
) mapped_e ON m.kd_rup = mapped_e.resolved_rup
WHERE COALESCE(m.kd_rup, mapped_e.resolved_rup) NOT IN (
      SELECT kd_rup_lama
      FROM history_kaji_ulang
      WHERE kd_rup_lama <> kd_rup_baru
  );
