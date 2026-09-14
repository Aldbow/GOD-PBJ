-- Table: formasi_jf_ukpbj

CREATE TABLE IF NOT EXISTS public.formasi_jf_ukpbj (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "No" INTEGER,
    "Jenjang" TEXT,
    "Formasi Kebutuhan" INTEGER,
    "Formasi Terpenuhi" INTEGER,
    "Kekurangan" INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tambahkan comment pada kolom agar lebih informatif
COMMENT ON TABLE public.formasi_jf_ukpbj IS 'Tabel untuk menyimpan data Formasi JF UKPBJ dari Excel/CSV';
COMMENT ON COLUMN public.formasi_jf_ukpbj."No" IS 'Nomor urut';
COMMENT ON COLUMN public.formasi_jf_ukpbj."Jenjang" IS 'Jenjang Jabatan Fungsional';
COMMENT ON COLUMN public.formasi_jf_ukpbj."Formasi Kebutuhan" IS 'Jumlah formasi yang dibutuhkan';
COMMENT ON COLUMN public.formasi_jf_ukpbj."Formasi Terpenuhi" IS 'Jumlah formasi yang sudah terpenuhi';
COMMENT ON COLUMN public.formasi_jf_ukpbj."Kekurangan" IS 'Kekurangan jumlah formasi';

-- Enable Row Level Security (RLS)
ALTER TABLE public.formasi_jf_ukpbj ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk read access agar bisa dibaca secara anonim jika dibutuhkan
CREATE POLICY "Enable read access for all users" 
ON public.formasi_jf_ukpbj
FOR SELECT 
USING (true);
