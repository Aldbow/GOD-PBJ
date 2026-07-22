-- Index untuk mempercepat view_paket_penyedia_master_data dan seluruh view
-- turunannya (view_dashboard_epurchasing_v6, view_dashboard_tender,
-- view_dashboard_pengadaan_langsung, view_dashboard_penunjukan_langsung,
-- view_dashboard_swakelola_v1, view_dashboard_gabungan_satker) -- semuanya
-- JOIN ke api_paket_penyedia_terumumkan & master_data lewat kolom-kolom ini,
-- dan sebelumnya tidak ada satupun index di tabel dasar tersebut.
--
-- Latar belakang: fetch E-Purchasing gagal dengan "canceling statement due to
-- statement timeout" karena view_dashboard_epurchasing_v6 melakukan FULL OUTER
-- JOIN di atas view_paket_penyedia_master_data (yang sendirinya sudah
-- DISTINCT ON + JOIN + ORDER BY) tanpa index sama sekali -- sehingga tiap
-- panggilan full-scan tabel dasar, dan panggilan itu terjadi berulang karena
-- semua modul Realisasi menarik data lewat loop pagination .range() di sisi
-- client.
--
-- Expression index (kd_rup::text, kd_satker_str::text) sengaja dibuat PERSIS
-- sama dengan cast yang dipakai di kondisi JOIN pada
-- sql/join_paket_penyedia_master_data.sql dan
-- sql/create_view_dashboard_epurchasing_v6.sql -- Postgres hanya memakai index
-- kalau ekspresinya cocok persis dengan yang ada di query.

CREATE INDEX IF NOT EXISTS idx_paket_terumumkan_kd_rup_text
  ON api_paket_penyedia_terumumkan ((kd_rup::text));

CREATE INDEX IF NOT EXISTS idx_paket_terumumkan_kd_satker_str_text
  ON api_paket_penyedia_terumumkan ((kd_satker_str::text));

CREATE INDEX IF NOT EXISTS idx_master_data_kode_satker_str
  ON master_data ("KODE SATKER_str");

CREATE INDEX IF NOT EXISTS idx_paket_e_purchasing_rup_code
  ON paket_e_purchasing (rup_code);

-- CATATAN PENTING: subquery fallback eselon1 di view_dashboard_epurchasing_v6
--   (SELECT v."UNIT KERJA" FROM view_paket_penyedia_master_data v
--    WHERE UPPER(v."SATUAN KERJA") = UPPER(e.nama_satker) ...)
-- TIDAK bisa dipercepat oleh index apapun, karena v."SATUAN KERJA" adalah
-- kolom hasil CASE WHEN di dalam view yang ber-DISTINCT ON -- bukan kolom
-- fisik tabel, sehingga index tidak "tembus" lewat situ. Index di atas
-- mempercepat bagian JOIN & DISTINCT ON-nya (porsi terbesar dari biaya query),
-- tapi kalau timeout masih terjadi setelah index ini terpasang, langkah
-- berikutnya adalah mengubah view_paket_penyedia_master_data dan
-- view_dashboard_epurchasing_v6 menjadi materialized view (refresh berkala).
