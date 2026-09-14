import { NextResponse } from 'next/server';
import { getApiSupabase } from '@/lib/supabase/apiClient';
import { GoogleGenAI } from '@google/genai';
import type { z } from 'zod';
import { detectStatusConflict } from '@/lib/kurasi/statusConsistency';
import { KurasiResponseSchema, KURASI_GEMINI_RESPONSE_SCHEMA, KURASI_SYSTEM_INSTRUCTION } from '@/lib/kurasi/prompt';
import { resolveDeterministicKurasi, type DeterministicRuleResult } from '@/lib/kurasi/deterministicRules';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Model dibuat konfigurabel lewat env agar mudah diganti tanpa ubah kode bila ID model berubah.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Batch (dinaikkan ke 100 agar dapat memproses lebih banyak data per request).
const BATCH_SIZE = 100;

type KurasiInput = {
  kd_rup: string;
  rup_name: string | null;
  pagu: number | null;
  metode_pengadaan: string | null;
  jenis_pengadaan: string | null;
  status_dikecualikan: boolean | null;
  alasan_dikecualikan: string | null;
  tipe: string | null;
  nama_ppk: string | null;
  satker: string | null;
  // Khusus Swakelola — kosong untuk sumber penyedia.
  nama_satker_penyelenggara?: string | null;
  nama_klpd_penyelenggara?: string | null;
};

// Ambil satu batch paket yang belum dikurasi dari sumber penyedia.
async function fetchPenyediaBatch(limit: number): Promise<KurasiInput[]> {
  const { data, error } = await getApiSupabase()
    .from('view_paket_penyedia_master_data')
    .select('kd_rup, rup_name:nama_paket, pagu, metode_pengadaan, jenis_pengadaan, status_dikecualikan, alasan_dikecualikan, tipe_paket, nama_ppk, satker:"SATUAN KERJA"')
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
    alasan_dikecualikan: (row.alasan_dikecualikan as string | null) ?? null,
    tipe: (row.tipe_paket as string | null) ?? null,
    nama_ppk: (row.nama_ppk as string | null) ?? null,
    satker: (row.satker as string | null) ?? null,
  }));
}

// Ambil satu batch paket swakelola yang belum dikurasi.
// Swakelola tidak punya kolom jenis_pengadaan/metode_pengadaan/dikecualikan; metode diisi 'Swakelola'.
async function fetchSwakelolaBatch(limit: number): Promise<KurasiInput[]> {
  const { data, error } = await getApiSupabase()
    .from('view_paket_swakelola_master_data')
    .select('kd_rup, rup_name:nama_paket, pagu, tipe_swakelola, nama_ppk, satker:"SATUAN KERJA", nama_satker_penyelenggara, nama_klpd_penyelenggara')
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
    alasan_dikecualikan: null,
    tipe: row.tipe_swakelola ? String(row.tipe_swakelola) : null,
    nama_ppk: (row.nama_ppk as string | null) ?? null,
    satker: (row.satker as string | null) ?? null,
    nama_satker_penyelenggara: (row.nama_satker_penyelenggara as string | null) ?? null,
    nama_klpd_penyelenggara: (row.nama_klpd_penyelenggara as string | null) ?? null,
  }));
}

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
        no_more_data: true,
      });
    }

    // 2. Pisahkan paket yang sudah bisa diputuskan tanpa AI (Swakelola & item non-PBJ
    // seperti Honor/Uang Saku — lihat resolveDeterministicKurasi) dari paket yang
    // benar-benar butuh penalaran AI (ambang nilai per metode, "Dikecualikan", dst).
    // Ini menghemat kuota/biaya Gemini secara signifikan karena SEMUA paket Swakelola
    // sebelumnya tetap dikirim ke AI hanya untuk kemudian statusnya ditimpa kode.
    const deterministicResults = new Map<string, DeterministicRuleResult>();
    const paketForAi: KurasiInput[] = [];
    for (const p of paketList) {
      const override = resolveDeterministicKurasi({
        metode_pengadaan: p.metode_pengadaan,
        nama_paket: p.rup_name,
        nama_satker_penyelenggara: p.nama_satker_penyelenggara,
        nama_klpd_penyelenggara: p.nama_klpd_penyelenggara,
      });
      if (override) {
        deterministicResults.set(p.kd_rup, override);
      } else {
        paketForAi.push(p);
      }
    }

    // 3. Panggil Gemini API (hanya untuk paket yang butuh penalaran) dengan mekanisme Fallback Model.
    let aiResult: z.infer<typeof KurasiResponseSchema> = { hasil: [] };

    if (paketForAi.length > 0) {
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
              { role: 'user', parts: [{ text: `Berikut adalah ${paketForAi.length} baris data JSON pengadaan (sumber: ${source}) yang harus Anda audit:\n${JSON.stringify(paketForAi)}` }] }
            ],
            config: {
              systemInstruction: KURASI_SYSTEM_INSTRUCTION,
              temperature: 0.1, // Rendah agar konsisten dengan aturan
              responseMimeType: "application/json",
              responseSchema: KURASI_GEMINI_RESPONSE_SCHEMA,
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

      // Parse hasil JSON dari Gemini dengan penanganan error khusus (mis. respons terpotong).
      try {
        aiResult = KurasiResponseSchema.parse(JSON.parse(response.text));
      } catch (parseErr) {
        const detail = parseErr instanceof Error ? parseErr.message : String(parseErr);
        throw new Error(`Gagal memproses respons AI (kemungkinan JSON terpotong). Coba kurangi BATCH_SIZE. Detail: ${detail}`);
      }
    }

    // 4. Update data ke Supabase (upsert paralel per item) — gabungkan hasil deterministik + hasil AI.
    let successCount = 0;
    const errors: { kd_rup: string; error: string }[] = [];
    const conflicted: string[] = [];

    const aiByKdRup = new Map(aiResult.hasil.map((item) => [item.kd_rup, item]));

    await Promise.all(paketList.map(async (p) => {
      const override = deterministicResults.get(p.kd_rup);
      const item = aiByKdRup.get(p.kd_rup);

      let finalStatus: string;
      let finalCatatan: string;
      let finalRekomendasi: string;

      if (override) {
        finalStatus = override.status_kurasi;
        finalCatatan = override.catatan_kurasi;
        finalRekomendasi = override.rekomendasi_kurasi;
      } else if (item) {
        // Jaring pengaman: kalau kesimpulan yang ditulis AI sendiri di catatan_kurasi
        // ("...Jadi statusnya Akurat") bertentangan dengan status_kurasi yang dipilihnya,
        // JANGAN simpan baris ini sebagai kurasi yang salah — biarkan status_kurasi tetap
        // kosong supaya otomatis diproses ulang di batch kurasi berikutnya (lihat filter
        // `.is('status_kurasi', null)` di fetchPenyediaBatch/fetchSwakelolaBatch). Tidak
        // relevan untuk hasil override deterministik di atas — itu konsisten by construction.
        if (detectStatusConflict(item.catatan_kurasi, item.status_kurasi)) {
          conflicted.push(p.kd_rup);
          return;
        }
        finalStatus = item.status_kurasi;
        finalCatatan = item.catatan_kurasi;
        finalRekomendasi = item.rekomendasi_kurasi;
      } else {
        // AI tidak mengembalikan baris ini (mis. terpotong) — biarkan untuk dicoba lagi nanti.
        return;
      }

      const { error } = await getApiSupabase()
        .from('ai_kurasi_paket')
        .upsert({
          kd_rup: p.kd_rup,
          status_kurasi: finalStatus,
          catatan_kurasi: finalCatatan,
          rekomendasi_kurasi: finalRekomendasi,
          updated_at: new Date().toISOString()
        }, { onConflict: 'kd_rup' });

      if (error) {
        errors.push({ kd_rup: p.kd_rup, error: error.message });
      } else {
        successCount++;
      }
    }));

    // Bila ada paket yang butuh diproses tapi TIDAK ada satu pun baris yang berhasil disimpan
    // ATAU dilewati karena konflik (jadi benar-benar nihil progres), hentikan loop dengan
    // error agar tidak memproses ulang batch yang sama tanpa henti.
    if (paketList.length > 0 && successCount === 0 && conflicted.length === 0) {
      return NextResponse.json(
        {
          error: 'Gagal menyimpan hasil kurasi ke database. Loop dihentikan untuk mencegah pengulangan tanpa henti.',
          details: errors,
          total_processed: paketList.length,
          updated_count: 0,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Berhasil mengurasi ${successCount} data (sumber: ${source}; ${deterministicResults.size} otomatis via aturan, ${paketForAi.length} via AI).`
        + (conflicted.length > 0 ? ` ${conflicted.length} data dilewati karena hasil AI tidak konsisten (akan dicoba ulang otomatis di kurasi berikutnya).` : ''),
      source,
      errors: errors.length > 0 ? errors : undefined,
      conflicted: conflicted.length > 0 ? conflicted : undefined,
      total_processed: paketList.length,
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
