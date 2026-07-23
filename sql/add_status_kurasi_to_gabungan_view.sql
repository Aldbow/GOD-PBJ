-- ============================================================================
-- Menambahkan kolom kurasi (status_kurasi, catatan_kurasi, rekomendasi_kurasi)
-- ke view_dashboard_gabungan_satker
-- ----------------------------------------------------------------------------
-- Tujuan: halaman Ringkasan mengambil SATU sumber (view gabungan) untuk semua
-- metrik. Dengan menambahkan kolom kurasi di sini, section "Akurasi Hasil
-- Kurasi Paket" bisa ikut difilter per Satker/PPK, dan fitur Export dapat
-- menyertakan status/catatan/rekomendasi kurasi — tanpa query terpisah.
--
-- Setiap sub-view dashboard (epurchasing, pengadaan langsung, penunjukan
-- langsung, tender, swakelola) SUDAH memiliki ketiga kolom kurasi, jadi di sini
-- kita hanya meneruskannya ke tiap cabang UNION ALL.
--
-- CATATAN: kolom baru ditambahkan DI AKHIR agar CREATE OR REPLACE VIEW valid.
-- Jalankan (atau jalankan ulang) di Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE VIEW view_dashboard_gabungan_satker AS
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'E-Purchasing' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi
FROM view_dashboard_epurchasing_v6
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi
FROM view_dashboard_pengadaan_langsung
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'Penunjukan Langsung' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi
FROM view_dashboard_penunjukan_langsung
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi
FROM view_dashboard_tender
UNION ALL
SELECT CAST(kd_rup AS TEXT) as kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, 'Swakelola' AS metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi
FROM view_dashboard_swakelola_v1;
