import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Zod Schema for Structured Output
const KurasiItemSchema = z.object({
  kd_rup: z.string(),
  status_kurasi: z.enum(['Akurat', 'Tidak Akurat', 'Belum Dikurasi']),
  catatan_kurasi: z.string().describe('Alasan mengapa data tersebut akurat atau tidak akurat berdasarkan aturan batasan nilai, metode, dan kode akun.'),
  rekomendasi_kurasi: z.string().describe('Saran perbaikan metode pemilihan atau tindakan lainnya jika data tidak akurat.'),
});

const KurasiResponseSchema = z.object({
  hasil: z.array(KurasiItemSchema),
});

export async function POST() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum dikonfigurasi di file .env.local' },
        { status: 500 }
      );
    }

    // 1. Ambil 100 data yang belum dikurasi dari view (agar otomatis membaca dari tabel terpisah)
    const { data: paketList, error: fetchError } = await supabase
      .from('view_paket_penyedia_master_data')
      .select('kd_rup, rup_name:nama_paket, pagu, metode_pengadaan, nama_ppk, satker:"SATUAN KERJA"')
      .is('status_kurasi', null)
      .limit(100);

    if (fetchError) {
      throw new Error(`Gagal mengambil data dari Supabase: ${fetchError.message}`);
    }

    if (!paketList || paketList.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data baru yang perlu dikurasi.' });
    }

    // 2. Siapkan Prompt Sistem beserta Aturan Validasi
    const systemInstruction = `Anda adalah AI Auditor Pengadaan yang bertugas memvalidasi dan memverifikasi akurasi Rencana Umum Pengadaan (RUP).
Tujuan: Memastikan setiap baris entri pengadaan mematuhi standar Kode Akun, Cara Pengadaan, Metode Pemilihan, dan Batasan Nilai sesuai pedoman.
Lakukan pengecekan silang (cross-check) pada setiap data RUP menggunakan tiga parameter utama berikut. Jika data tidak sesuai dengan aturan di bawah ini, tandai sebagai "Tidak Akurat" dan berikan rekomendasi perbaikan. Jika sesuai tandai "Akurat".

ATURAN:
1. Validasi Batasan Nilai dan Metode Pemilihan:
- E-Purchasing: Tidak dibatasi nilai (Barang, Konstruksi, Jasa Konsultansi, Jasa Lainnya). Wajib jika ada di e-katalog.
- Pengadaan Langsung (Barang & Jasa Lainnya): Maks Rp200 juta. (Jika >= Rp50 juta wajib lewat SPSE transaksional).
- Pengadaan Langsung (Pekerjaan Konstruksi): Maks Rp400 juta. (Jika >= Rp50 juta wajib lewat SPSE transaksional).
- Pengadaan Langsung (Jasa Konsultansi): Maks Rp100 juta. (Wajib lewat SPSE transaksional).
- Tender (Barang & Jasa Lainnya): > Rp200 juta.
- Tender (Pekerjaan Konstruksi): > Rp400 juta.
- Seleksi (Jasa Konsultansi): > Rp100 juta.
- Tender Cepat: Tidak dibatasi nilai.
- Penunjukan Langsung: Darurat/Keadaan Kahar, Monopoli (1 penyedia), Inpres.

2. Validasi Kesesuaian Kode Akun dan Cara Pengadaan (Jika field kode akun tersedia):
- Pengadaan Langsung/E-Purchasing: Wajib pada akun 521111, 521113, 521119, 521211, 521219, 521234, 521252, 521811, 521832, 523112, 523123, 526112, 526312.
- Dikecualikan: Hanya untuk 521114, 522111, 522112, 522113, 522119, 522121.
- Pengadaan Langsung/E-Purchasing/Tender: 522141, 522191, berbagai jenis Pemeliharaan (523111, dst), Belanja Modal (532111, dst).
- Pengadaan Langsung/Seleksi: Jasa Konsultan (522131) dan Perencanaan/Pengawasan Gedung (533115).
- Non Pengadaan: Honor (521115, 521213), Penghargaan (521231), Jasa Profesi (522151), Perjalanan Dinas (524111, dst).
- Paket Meeting (524114 & 524119): Komponen hotel=Penyedia, transport/uang harian=Non Pengadaan.

3. Aturan Khusus:
- Swakelola (526123, 533113): Wajib punya SK.
- Belanja Asuransi Gedung (523113): Wajib Penunjukan Langsung.
- Belanja Modal Sertifikat Tanah (531114): Wajib Pengadaan Langsung.`;

    // 3. Panggil Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `Berikut adalah ${paketList.length} baris data JSON pengadaan yang harus Anda audit:\n${JSON.stringify(paketList)}` }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Rendah agar konsisten dengan aturan
        responseMimeType: "application/json",
        // Using Type.OBJECT mapped from zod
        responseSchema: {
          type: "OBJECT",
          properties: {
            hasil: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  kd_rup: { type: "STRING" },
                  status_kurasi: { type: "STRING", enum: ["Akurat", "Tidak Akurat", "Belum Dikurasi"] },
                  catatan_kurasi: { type: "STRING" },
                  rekomendasi_kurasi: { type: "STRING" },
                },
                required: ["kd_rup", "status_kurasi", "catatan_kurasi", "rekomendasi_kurasi"]
              }
            }
          },
          required: ["hasil"]
        },
      }
    });

    if (!response.text) {
      throw new Error('Gemini API mengembalikan respons kosong.');
    }

    // Parse hasil JSON dari Gemini
    const aiResult = JSON.parse(response.text) as z.infer<typeof KurasiResponseSchema>;

    // 4. Update data ke Supabase secara bulk/iterasi
    let successCount = 0;
    const errors: any[] = [];

    // Kita lakukan upsert satu per satu secara paralel dengan Promise.all
    await Promise.all(aiResult.hasil.map(async (item) => {
      const { data, error } = await supabase
        .from('ai_kurasi_paket')
        .upsert({
          kd_rup: item.kd_rup,
          status_kurasi: item.status_kurasi,
          catatan_kurasi: item.catatan_kurasi,
          rekomendasi_kurasi: item.rekomendasi_kurasi,
          updated_at: new Date().toISOString()
        }, { onConflict: 'kd_rup' });

      if (error) {
        errors.push({ kd_rup: item.kd_rup, error: error.message });
      } else {
        successCount++;
      }
    }));

    return NextResponse.json({ 
      message: `Berhasil mengurasi ${successCount} data.`,
      errors: errors.length > 0 ? errors : undefined,
      total_processed: aiResult.hasil.length
    });

  } catch (error: any) {
    console.error('Error saat melakukan kurasi AI:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem', details: error.message },
      { status: 500 }
    );
  }
}
