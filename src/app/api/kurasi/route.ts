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

// Model dibuat konfigurabel lewat env agar mudah diganti tanpa ubah kode bila ID model berubah.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Batch (dinaikkan ke 100 agar dapat memproses lebih banyak data per request).
const BATCH_SIZE = 100;

// Zod Schema for Structured Output
const KurasiItemSchema = z.object({
  kd_rup: z.string(),
  status_kurasi: z.enum(['Akurat', 'Tidak Akurat', 'Belum Dikurasi']),
  catatan_kurasi: z.string().describe('Alasan mengapa data tersebut akurat atau tidak akurat berdasarkan kesesuaian pagu terhadap metode dan jenis pengadaan.'),
  rekomendasi_kurasi: z.string().describe('Saran perbaikan metode pemilihan atau tindakan lainnya jika data tidak akurat.'),
});

const KurasiResponseSchema = z.object({
  hasil: z.array(KurasiItemSchema),
});

type KurasiInput = {
  kd_rup: string;
  rup_name: string | null;
  pagu: number | null;
  metode_pengadaan: string | null;
  jenis_pengadaan: string | null;
  status_dikecualikan: boolean | null;
  tipe: string | null;
  nama_ppk: string | null;
  satker: string | null;
};

// Ambil satu batch paket yang belum dikurasi dari sumber penyedia.
async function fetchPenyediaBatch(limit: number): Promise<KurasiInput[]> {
  const { data, error } = await supabase
    .from('view_paket_penyedia_master_data')
    .select('kd_rup, rup_name:nama_paket, pagu, metode_pengadaan, jenis_pengadaan, status_dikecualikan, tipe_paket, nama_ppk, satker:"SATUAN KERJA"')
    .is('status_kurasi', null)
    .limit(limit);

  if (error) throw new Error(`Gagal mengambil data penyedia dari Supabase: ${error.message}`);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    kd_rup: String(row.kd_rup),
    rup_name: (row.rup_name as string | null) ?? null,
    pagu: (row.pagu as number | null) ?? null,
    metode_pengadaan: (row.metode_pengadaan as string | null) ?? null,
    jenis_pengadaan: (row.jenis_pengadaan as string | null) ?? null,
    status_dikecualikan: (row.status_dikecualikan as boolean | null) ?? null,
    tipe: (row.tipe_paket as string | null) ?? null,
    nama_ppk: (row.nama_ppk as string | null) ?? null,
    satker: (row.satker as string | null) ?? null,
  }));
}

// Ambil satu batch paket swakelola yang belum dikurasi.
// Swakelola tidak punya kolom jenis_pengadaan/metode_pengadaan; metode diisi 'Swakelola'.
async function fetchSwakelolaBatch(limit: number): Promise<KurasiInput[]> {
  const { data, error } = await supabase
    .from('view_paket_swakelola_master_data')
    .select('kd_rup, rup_name:nama_paket, pagu, tipe_swakelola, nama_ppk, satker:"SATUAN KERJA"')
    .is('status_kurasi', null)
    .limit(limit);

  if (error) throw new Error(`Gagal mengambil data swakelola dari Supabase: ${error.message}`);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    kd_rup: String(row.kd_rup),
    rup_name: (row.rup_name as string | null) ?? null,
    pagu: (row.pagu as number | null) ?? null,
    metode_pengadaan: 'Swakelola',
    jenis_pengadaan: 'Swakelola',
    status_dikecualikan: null,
    tipe: row.tipe_swakelola ? String(row.tipe_swakelola) : null,
    nama_ppk: (row.nama_ppk as string | null) ?? null,
    satker: (row.satker as string | null) ?? null,
  }));
}

const SYSTEM_INSTRUCTION = `Anda adalah AI Auditor Pengadaan yang memvalidasi akurasi METODE PEMILIHAN pada Rencana Umum Pengadaan (RUP).

DATA YANG TERSEDIA untuk tiap paket: kd_rup, rup_name (nama paket), pagu (nilai anggaran dalam Rupiah), metode_pengadaan, jenis_pengadaan (Barang / Pekerjaan Konstruksi / Jasa Konsultansi / Jasa Lainnya / Swakelola), status_dikecualikan, dan tipe.

PENTING — BATASAN DATA:
- Data KODE AKUN / mata anggaran TIDAK tersedia. JANGAN menilai kesesuaian kode akun.
- Fokus penilaian HANYA pada kesesuaian nilai pagu terhadap metode_pengadaan dan jenis_pengadaan.
- Jika data tidak cukup untuk menilai (mis. jenis_pengadaan kosong/tidak jelas, atau butuh informasi yang tidak ada), tandai "Belum Dikurasi". JANGAN menebak.

STATUS:
- "Akurat": metode pemilihan sesuai dengan pagu dan jenis pengadaannya.
- "Tidak Akurat": metode melanggar batas nilai untuk jenis pengadaannya.
- "Belum Dikurasi": data tidak cukup untuk dinilai secara meyakinkan.

ATURAN BATAS NILAI (Perpres No. 46 Tahun 2025):
- E-Purchasing: tidak dibatasi nilai (wajib bila tersedia di katalog elektronik).
- Pengadaan Langsung — Barang & Jasa Lainnya: pagu maksimal Rp200.000.000.
- Pengadaan Langsung — Pekerjaan Konstruksi: pagu maksimal Rp400.000.000.
- Pengadaan Langsung — Jasa Konsultansi: pagu maksimal Rp100.000.000.
- Tender — Barang & Jasa Lainnya: pagu di atas Rp200.000.000.
- Tender — Pekerjaan Konstruksi: pagu di atas Rp400.000.000.
- Seleksi — Jasa Konsultansi: pagu di atas Rp100.000.000.
- Tender Cepat: tidak dibatasi nilai (untuk spesifikasi standar, penyedia terkualifikasi).
- Penunjukan Langsung: tidak dibatasi nilai, HANYA untuk kondisi khusus (Keadaan Kahar / Hanya 1 Penyedia yang mampu / Instruksi Presiden / sesuai Pasal 38 (5) dan Pasal 41 (5) Perpres No.46/2025). Karena info ini tidak ada di data, tandai "Belum Dikurasi" — jangan otomatis "Tidak Akurat".
- Swakelola: tidak dinilai dari batas nilai penyedia. Tandai "Belum Dikurasi" kecuali ada indikasi pelanggaran yang jelas.
- Jika status_dikecualikan bernilai true: perlakukan sebagai pengadaan yang dikecualikan; umumnya "Akurat" selama pagu wajar.

TUGAS TAMBAHAN (SPSE Transaksional): 
Jika metode adalah "Pengadaan Langsung", dan nilainya memenuhi syarat berikut:
- Barang/Pekerjaan Konstruksi/Jasa Lainnya dengan pagu >= Rp 50.000.000
- ATAU Jasa Konsultansi berapapun nilainya
Maka WAJIB tambahkan kalimat ini di akhir rekomendasi_kurasi: "Catatan: Pengadaan Langsung ini wajib menggunakan SPSE fitur transaksional sesuai Perpres 46/2025." (walaupun status_kurasi nya Akurat).

Untuk setiap paket berikan:
- status_kurasi: salah satu dari nilai di atas.
- catatan_kurasi: alasan singkat berbasis aturan (sebutkan pagu, metode, dan jenis bila relevan).
- rekomendasi_kurasi: saran metode yang seharusnya bila "Tidak Akurat" (atau pengingat SPSE bila relevan); isi "-" bila murni "Akurat" dan tidak butuh pengingat SPSE.`;

export async function POST() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum dikonfigurasi di file .env.local' },
        { status: 500 }
      );
    }

    // 1. Ambil batch campuran (penyedia & swakelola) agar keduanya diproses secara bersamaan.
    const halfBatch = Math.floor(BATCH_SIZE / 2);
    let paketPenyedia = await fetchPenyediaBatch(halfBatch);
    let paketSwakelola = await fetchSwakelolaBatch(halfBatch);

    // Jika salah satu tipe kurang dari setengah batch (karena sudah hampir habis di database), 
    // alokasikan sisa kuotanya ke tipe yang lain agar jumlah data yang diproses tetap optimal sebesar BATCH_SIZE.
    if (paketPenyedia.length < halfBatch) {
      const sisaKuota = BATCH_SIZE - paketPenyedia.length;
      paketSwakelola = await fetchSwakelolaBatch(sisaKuota);
    } else if (paketSwakelola.length < halfBatch) {
      const sisaKuota = BATCH_SIZE - paketSwakelola.length;
      paketPenyedia = await fetchPenyediaBatch(sisaKuota);
    }

    const paketList = [...paketPenyedia, ...paketSwakelola];
    const source = 'penyedia & swakelola (campuran)';

    if (paketList.length === 0) {
      return NextResponse.json({
        message: 'Tidak ada data baru yang perlu dikurasi.',
        total_processed: 0,
        updated_count: 0,
      });
    }

    // 2. Panggil Gemini API dengan mekanisme Fallback Model
    let response;
    let usedModel = '';
    
    // Daftar model prioritas fallback jika terkena rate limit
    const fallbackModels = Array.from(new Set([
      GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-3.0-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite'
    ]));

    let lastError: unknown;
    for (const model of fallbackModels) {
      try {
        usedModel = model;
        response = await ai.models.generateContent({
          model: model,
          contents: [
            { role: 'user', parts: [{ text: `Berikut adalah ${paketList.length} baris data JSON pengadaan (sumber: ${source}) yang harus Anda audit:\n${JSON.stringify(paketList)}` }] }
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1, // Rendah agar konsisten dengan aturan
            responseMimeType: "application/json",
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
        
        // Berhasil, keluar dari loop pencarian model fallback
        break;
      } catch (error) {
        lastError = error;
        if (isRateLimitOrModelError(error)) {
          console.warn(`[Kurasi] Model ${model} terkena limit atau tidak tersedia. Mencoba model fallback...`);
          continue;
        } else {
          // Jika error bukan rate limit, langsung lemparkan
          throw error;
        }
      }
    }

    if (!response) {
      // Jika semua model gagal (karena limit), lempar error terakhir yang tertangkap
      throw lastError;
    }

    if (!response.text) {
      throw new Error(`Gemini API mengembalikan respons kosong (model: ${usedModel}).`);
    }

    // 3. Parse hasil JSON dari Gemini dengan penanganan error khusus (mis. respons terpotong).
    let aiResult: z.infer<typeof KurasiResponseSchema>;
    try {
      aiResult = KurasiResponseSchema.parse(JSON.parse(response.text));
    } catch (parseErr) {
      const detail = parseErr instanceof Error ? parseErr.message : String(parseErr);
      throw new Error(`Gagal memproses respons AI (kemungkinan JSON terpotong). Coba kurangi BATCH_SIZE. Detail: ${detail}`);
    }

    // 4. Update data ke Supabase (upsert paralel per item).
    let successCount = 0;
    const errors: { kd_rup: string; error: string }[] = [];

    await Promise.all(aiResult.hasil.map(async (item) => {
      const { error } = await supabase
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

    // Bila AI mengembalikan hasil tapi TIDAK ada satu pun baris yang berhasil disimpan,
    // hentikan loop dengan error agar tidak memproses ulang batch yang sama tanpa henti.
    if (aiResult.hasil.length > 0 && successCount === 0) {
      return NextResponse.json(
        {
          error: 'Gagal menyimpan hasil kurasi ke database. Loop dihentikan untuk mencegah pengulangan tanpa henti.',
          details: errors,
          total_processed: aiResult.hasil.length,
          updated_count: 0,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Berhasil mengurasi ${successCount} data (sumber: ${source}) menggunakan model ${usedModel}.`,
      source,
      errors: errors.length > 0 ? errors : undefined,
      total_processed: aiResult.hasil.length,
      updated_count: successCount,
    });

  } catch (error) {
    console.error('Error saat melakukan kurasi AI:', error);
    const detail = error instanceof Error ? error.message : String(error);

    // Deteksi rate limit / kuota Gemini (RESOURCE_EXHAUSTED) dan teruskan sebagai HTTP 429,
    // agar frontend menjalankan logika tunggu-lalu-lanjut, bukan berhenti total.
    if (isRateLimitOrModelError(error)) {
      return NextResponse.json(
        {
          error: 'Batas akses/kuota Gemini API tercapai (429) atau model tidak tersedia.',
          retryAfterSeconds: extractRetryAfterSeconds(detail),
          details: detail,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem', details: detail },
      { status: 500 }
    );
  }
}

// Cek apakah error dari Gemini adalah 429 (Rate Limit) atau 404/400 (Model Not Found/Invalid/Deprecated).
function isRateLimitOrModelError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: number }).status;
    if (status === 429 || status === 404 || status === 400) return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('RESOURCE_EXHAUSTED') || msg.includes('"code":429') || msg.includes('exceeded your current quota') || msg.includes('"code":404') || msg.includes('NOT_FOUND') || msg.includes('Invalid model') || msg.includes('"code":400');
}

// Ambil saran jeda retry (detik) dari pesan error Gemini, mis. "retryDelay":"34s".
function extractRetryAfterSeconds(message: string): number {
  const match = message.match(/"retryDelay":"(\d+)(?:\.\d+)?s"/);
  const parsed = match ? parseInt(match[1], 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 35;
}
