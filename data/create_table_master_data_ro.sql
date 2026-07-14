-- ==============================================================================
-- Script Pembuatan Tabel master_data_ro
-- Sumber file: data/Master Data RO (1).xlsx
-- ==============================================================================

-- 1. Hapus tabel jika sudah ada (opsional, hati-hati jika ada data penting)
DROP TABLE IF EXISTS public.master_data_ro CASCADE;

-- 2. Pembuatan struktur tabel
CREATE TABLE public.master_data_ro (
    id SERIAL PRIMARY KEY,
    no_urut INTEGER,
    kode_id_paket BIGINT,
    nama_paket TEXT,
    jenis_pengadaan TEXT,
    nilai_paket NUMERIC,
    lokasi TEXT,
    waktu_pengadaan TEXT,
    skema TEXT,
    kendala TEXT,
    mitigasi TEXT,
    ro TEXT,
    realisasi NUMERIC
);

-- 3. Beri indeks pada kolom kode_id_paket untuk mempercepat pencarian/join
CREATE INDEX idx_master_data_ro_kode_paket ON public.master_data_ro (kode_id_paket);

-- 4. Set RLS (Row Level Security) agar tabel bisa diakses jika diperlukan
ALTER TABLE public.master_data_ro ENABLE ROW LEVEL SECURITY;

-- 5. Buat kebijakan (policy) agar bisa dibaca secara publik/anon (sesuaikan dengan keamanan Supabase Anda)
CREATE POLICY "Allow public read access on master_data_ro"
ON public.master_data_ro
FOR SELECT
TO public
USING (true);

-- Catatan untuk Import CSV:
-- Pastikan judul kolom di file Excel/CSV (Header) Anda cocok atau di-mapping ke nama-nama kolom tabel di atas:
-- no_urut = No
-- kode_id_paket = Kode/ID paket
-- nama_paket = Nama paket
-- jenis_pengadaan = Jenis Pengadaan (barang/jasa/konstruksi/lainnya)
-- nilai_paket = Nilai Paket (Rp)
-- lokasi = Lokasi
-- waktu_pengadaan = Waktu pengadaan (bulan/triwulan)
-- skema = Skema (tender/e-purchasing/katalog/lainnya)
-- kendala = Kendala
-- mitigasi = Mitigasi
-- ro = RO
-- realisasi = REALISASI
