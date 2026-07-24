-- SQL Script untuk membuat tabel dari data/non-tender-selesai_2026.csv
-- Sangat disarankan menggunakan tipe data TEXT untuk semua kolom pada tahap import awal
-- untuk menghindari error (seperti format angka yang menggunakan koma atau tanggal yang tidak standar).

CREATE TABLE public.non_tender_selesai (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url_lpse TEXT,
    kd_satker TEXT,
    mtd_pemilihan TEXT,
    nilai_negosiasi TEXT,
    hps TEXT,
    nilai_kontrak TEXT,
    kontrak_id TEXT,
    kd_lpse TEXT,
    pagu TEXT,
    jenis_klpd TEXT,
    tgl_selesai_nontender TEXT,
    kd_satker_str TEXT,
    lokasi_pekerjaan TEXT,
    jenis_pengadaan TEXT,
    kd_pkt_dce TEXT,
    nama_satker TEXT,
    nilai_umk_kontrak TEXT,
    nama_lpse TEXT,
    lls_id TEXT,
    nama_paket TEXT,
    provinsi TEXT,
    mak TEXT,
    nilai_penawaran TEXT,
    kd_klpd TEXT,
    npwp16_penyedia TEXT,
    tgl_pengumuman_nontender TEXT,
    kd_penyedia TEXT,
    kd_nontender TEXT,
    kualifikasi_paket TEXT,
    kabkota TEXT,
    tahun_anggaran TEXT,
    nilai_terkoreksi TEXT,
    kd_rup TEXT,
    nama_penyedia TEXT,
    status_nontender TEXT,
    kontrak_pembayaran TEXT,
    sumber_dana TEXT,
    nilai_pdn_kontrak TEXT,
    nama_klpd TEXT,
    npwp_penyedia TEXT,
    lpse_id TEXT,
    last_update_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Memberikan hak akses anonim untuk read (opsional, sesuaikan dengan RLS Supabase Anda)
ALTER TABLE public.non_tender_selesai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" 
ON public.non_tender_selesai 
FOR SELECT 
USING (true);
