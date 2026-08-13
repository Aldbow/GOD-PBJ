import { NextResponse } from 'next/server';
import { getApiSupabase } from '@/lib/supabase/apiClient';
import { GoogleGenAI } from '@google/genai';
import { detectStatusConflict } from '@/lib/kurasi/statusConsistency';
import { KurasiResponseSchema, KURASI_GEMINI_RESPONSE_SCHEMA, KURASI_SYSTEM_INSTRUCTION } from '@/lib/kurasi/prompt';
import { resolveDeterministicKurasi } from '@/lib/kurasi/deterministicRules';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kd_rup } = body;

    if (!kd_rup) {
      return NextResponse.json({ error: 'kd_rup harus disediakan.' }, { status: 400 });
    }

    const supabase = await getApiSupabase();

    // Fetch from penyedia first
    let res = await supabase
      .from('view_paket_penyedia_master_data')
      .select('kd_rup, rup_name:nama_paket, pagu, metode_pengadaan, jenis_pengadaan, status_dikecualikan, alasan_dikecualikan, tipe_paket, nama_ppk, satker:"SATUAN KERJA"')
      .eq('kd_rup', kd_rup)
      .maybeSingle();
    let isSwakelola = false;
    let dataPaket: any = res.data;

    if (!dataPaket) {
      // Try swakelola
      const resSwa = await supabase.from('view_paket_swakelola_master_data').select('kd_rup, rup_name:nama_paket, pagu, tipe_swakelola, nama_ppk, satker:"SATUAN KERJA", nama_satker_penyelenggara, nama_klpd_penyelenggara').eq('kd_rup', kd_rup).maybeSingle();
      if (resSwa.data) {
        dataPaket = resSwa.data;
        isSwakelola = true;
      }
    }

    if (!dataPaket) {
      return NextResponse.json({ error: 'Paket tidak ditemukan.' }, { status: 404 });
    }

    const inputData = {
      kd_rup: String(dataPaket.kd_rup),
      rup_name: dataPaket.rup_name,
      pagu: Number(dataPaket.pagu),
      metode_pengadaan: isSwakelola ? 'Swakelola' : (dataPaket as any).metode_pengadaan,
      jenis_pengadaan: isSwakelola ? 'Swakelola' : (dataPaket as any).jenis_pengadaan,
      status_dikecualikan: isSwakelola ? null : (dataPaket as any).status_dikecualikan === 'Ya',
      alasan_dikecualikan: isSwakelola ? null : ((dataPaket as any).alasan_dikecualikan ?? null),
      tipe: isSwakelola ? (dataPaket as any).tipe_swakelola : (dataPaket as any).tipe_paket,
      nama_ppk: dataPaket.nama_ppk,
      satker: dataPaket.satker,
      ...(isSwakelola ? {
        nama_satker_penyelenggara: (dataPaket as any).nama_satker_penyelenggara,
        nama_klpd_penyelenggara: (dataPaket as any).nama_klpd_penyelenggara,
      } : {})
    };

    // Aturan deterministik (Swakelola & item non-PBJ seperti Honor/Uang Saku) — sama
    // persis dengan yang dipakai kurasi batch (lihat deterministicRules.ts). Kalau
    // paket ini match, tidak perlu memanggil Gemini sama sekali: hasilnya sudah pasti,
    // dan melewati AI menghemat kuota + menghindari risiko rate limit.
    const override = resolveDeterministicKurasi({
      metode_pengadaan: inputData.metode_pengadaan,
      nama_paket: inputData.rup_name,
      nama_satker_penyelenggara: (inputData as any).nama_satker_penyelenggara,
      nama_klpd_penyelenggara: (inputData as any).nama_klpd_penyelenggara,
    });

    let finalStatus: string;
    let finalCatatan: string;
    let finalRekomendasi: string;

    if (override) {
      finalStatus = override.status_kurasi;
      finalCatatan = override.catatan_kurasi;
      finalRekomendasi = override.rekomendasi_kurasi;
    } else {
      const payloadText = JSON.stringify([inputData], null, 2);

      let aiResult;
      try {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: `Lakukan kurasi untuk paket berikut:\n\n${payloadText}` }] }],
          config: {
            systemInstruction: KURASI_SYSTEM_INSTRUCTION,
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: KURASI_GEMINI_RESPONSE_SCHEMA,
          },
        });

        if (!response.text) {
          throw new Error("AI mengembalikan respons kosong.");
        }
        aiResult = KurasiResponseSchema.parse(JSON.parse(response.text));
      } catch (err: any) {
        if (err.status === 429) {
          return NextResponse.json({ error: 'Limit API tercapai.', retryAfterSeconds: 35 }, { status: 429 });
        }
        return NextResponse.json({ error: 'Gagal menghubungi AI.' }, { status: 500 });
      }

      const item = aiResult.hasil[0];
      if (!item) {
        return NextResponse.json({ error: 'AI tidak mengembalikan hasil kurasi.' }, { status: 500 });
      }

      // Jaring pengaman: kalau kesimpulan yang ditulis AI sendiri di catatan_kurasi
      // bertentangan dengan tag status_kurasi-nya, jangan simpan hasil yang salah —
      // minta user coba kurasi ulang.
      if (detectStatusConflict(item.catatan_kurasi, item.status_kurasi)) {
        return NextResponse.json(
          { error: 'Hasil AI tidak konsisten (catatan dan status bertentangan). Silakan coba "Kurasi Ulang" sekali lagi.' },
          { status: 409 }
        );
      }

      finalStatus = item.status_kurasi;
      finalCatatan = item.catatan_kurasi;
      finalRekomendasi = item.rekomendasi_kurasi;
    }

    const { error: upsertError } = await supabase
      .from('ai_kurasi_paket')
      .upsert({
        kd_rup: kd_rup,
        status_kurasi: finalStatus,
        catatan_kurasi: finalCatatan,
        rekomendasi_kurasi: finalRekomendasi,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'kd_rup' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        kd_rup,
        status_kurasi: finalStatus,
        catatan_kurasi: finalCatatan,
        rekomendasi_kurasi: finalRekomendasi,
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
