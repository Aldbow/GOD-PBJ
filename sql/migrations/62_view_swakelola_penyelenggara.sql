-- ============================================================================
-- TAMBAH KOLOM PENYELENGGARA KE view_dashboard_swakelola_v1
-- ----------------------------------------------------------------------------
-- MASALAH
--   Modal detail Swakelola (SwakelolaView.tsx) menampilkan "KLPD Penyelenggara"
--   dan "Satker Penyelenggara", tapi selalu tampil "-" untuk semua paket.
--   Root cause: kolom kd_klpd_penyelenggara / nama_klpd_penyelenggara /
--   nama_satker_penyelenggara SUDAH ADA di sumber data (kolom CSV
--   paket-swakelola-terumumkan_2026.csv -> tabel api_paket_swakelola_terumumkan
--   -> ikut terbawa di view_paket_swakelola_master_data via `p.*`), tapi
--   view_dashboard_swakelola_v1 tidak pernah men-SELECT kolom tsb.
--
-- SOLUSI
--   CREATE OR REPLACE VIEW dengan definisi PERSIS sama seperti yang live
--   (dikonfirmasi via `SELECT pg_get_viewdef('view_dashboard_swakelola_v1'::regclass, true)`
--   di Supabase SQL Editor — identik dengan 42_views_lock_pagu.sql bagian
--   SWAKELOLA), HANYA menambah 3 kolom baru di akhir daftar SELECT. Postgres
--   mewajibkan CREATE OR REPLACE VIEW mempertahankan nama & urutan kolom lama
--   persis sama; kolom baru harus ditambah di akhir — makanya 3 kolom ini
--   diletakkan setelah is_from_sirup, bukan disisipkan di tengah.
--
-- CATATAN
--   Sebagian paket swakelola (tipe 1/2, dikerjakan sendiri) memang tidak
--   punya K/L/D penyelenggara lain -> kolom akan NULL, dan frontend sudah
--   menampilkan fallback "-" untuk NULL (lihat SwakelolaView.tsx).
-- ============================================================================

CREATE OR REPLACE VIEW view_dashboard_swakelola_v1 AS
SELECT COALESCE(m.kd_rup, e.kd_rup) AS kd_rup,
    COALESCE(m.nama_paket, e.nama_paket) AS rup_name,
    COALESCE(m.pagu, 0::numeric) AS pagu,
    m.tgl_pengumuman_paket,
    m.status_aktif_rup,
    COALESCE(m."MASTER_NAMA_PPK", m.nama_ppk, 'Tidak Diketahui'::text) AS nama_ppk,
    COALESCE(m."UNIT KERJA", ( SELECT v."UNIT KERJA"
           FROM view_paket_swakelola_master_data v
          WHERE upper(v."SATUAN KERJA") = upper(e.nama_satker) AND v."UNIT KERJA" IS NOT NULL
         LIMIT 1), 'Tidak Diketahui'::text) AS eselon1,
    COALESCE(m."SATUAN KERJA", e.nama_satker, 'Tidak Diketahui'::text) AS satker,
    COALESCE(m.kd_klpd, e.kd_klpd) AS kode_klpd,
    COALESCE(e.status_swakelola_pct_ket, 'BELUM REALISASI'::text) AS status,
    COALESCE(e.total_realisasi, 0::numeric) AS total,
    COALESCE(e.tipe_swakelola, m.tipe_swakelola::text) AS tipe_swakelola,
    e.kd_swakelola_pct AS order_id,
    ''::text AS kode_penyedia,
    m.status_kurasi,
    m.catatan_kurasi,
    m.rekomendasi_kurasi,
        CASE
            WHEN m.kd_rup IS NOT NULL THEN true
            ELSE false
        END AS is_from_sirup,
    m.kd_klpd_penyelenggara,
    m.nama_klpd_penyelenggara,
    m.nama_satker_penyelenggara
   FROM view_paket_swakelola_master_data m
     FULL JOIN api_pencatatan_swakelola e ON m.kd_rup::text = e.kd_rup::text
  WHERE e.status_swakelola_pct_ket !~~* '%cancel%'::text OR e.status_swakelola_pct_ket IS NULL;

-- ============================================================================
-- VERIFIKASI (opsional) — jalankan setelah di atas
-- ----------------------------------------------------------------------------
-- Cek beberapa baris yang seharusnya punya penyelenggara (biasanya tipe 3/4):
--   SELECT kd_rup, rup_name, tipe_swakelola, nama_klpd_penyelenggara, nama_satker_penyelenggara
--   FROM view_dashboard_swakelola_v1
--   WHERE nama_satker_penyelenggara IS NOT NULL
--   LIMIT 20;
-- ============================================================================
