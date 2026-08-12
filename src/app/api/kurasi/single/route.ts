import { NextResponse } from 'next/server';
import { getApiSupabase } from '@/lib/supabase/apiClient';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { detectStatusConflict } from '@/lib/kurasi/statusConsistency';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// PENTING: catatan_kurasi diletakkan SEBELUM status_kurasi dengan sengaja — lihat
// komentar sama di src/app/api/kurasi/route.ts. Urutan ini memaksa AI menulis alasan
// dulu baru menyimpulkan status, supaya keduanya tidak saling bertentangan.
const KurasiResponseSchema = z.object({
  hasil: z.array(z.object({
    kd_rup: z.string(),
    catatan_kurasi: z.string(),
    status_kurasi: z.enum(['Akurat', 'Tidak Akurat', 'Belum Dikurasi']),
    rekomendasi_kurasi: z.string(),
  }))
});

const SYSTEM_INSTRUCTION = `Anda adalah AI Auditor Pengadaan yang memvalidasi akurasi METODE PEMILIHAN pada Rencana Umum Pengadaan (RUP).
Tugas Anda mengevaluasi apakah metode pengadaan yang dipilih SESUAI dengan pagu anggaran dan jenis pengadaan menurut regulasi (Perpres No. 46 Tahun 2025).

ATURAN UTAMA:
- Pengadaan Langsung: Pagu maksimal Rp 200 Juta (Barang/Konstruksi/Jasa Lainnya) atau maksimal Rp 100 Juta (Jasa Konsultansi).
- E-Purchasing (Katalog Elektronik): Tidak ada batasan nilai maksimal pagu. Berapapun pagunya, E-Purchasing selalu Akurat.
- Tender / Seleksi: Untuk pagu di atas batas Pengadaan Langsung, dan tidak menggunakan E-Purchasing. (Seleksi khusus untuk Jasa Konsultansi).
- Jika data tidak cukup untuk menilai (mis. jenis_pengadaan kosong/tidak jelas, atau butuh informasi yang tidak ada), tandai "Belum Dikurasi". JANGAN menebak, namun Anda WAJIB memberikan alasan spesifik di catatan_kurasi.

Output harus berupa:
- "Akurat": metode sesuai dengan batas nilai dan peruntukannya.
- "Tidak Akurat": metode menyalahi aturan batas nilai/jenis.
- "Belum Dikurasi": data tidak cukup untuk dinilai secara meyakinkan.

Khusus untuk metode "Pengadaan Langsung":
Meskipun batas nilainya tepat, metode ini memiliki risiko pemecahan paket atau transaksional di luar sistem.
Maka WAJIB tambahkan kalimat ini di akhir rekomendasi_kurasi: "Catatan: Pengadaan Langsung ini wajib menggunakan SPSE fitur transaksional sesuai Perpres 46/2025." (walaupun status_kurasi nya Akurat).

Anda akan menerima data berupa JSON array.
Kembalikan respon DALAM FORMAT JSON SESUAI SCHEMA, IKUTI URUTAN INI (jangan menyimpulkan status_kurasi sebelum selesai menulis catatan_kurasi):
- hasil (array dari object):
- kd_rup: kode unik paket (string)
- catatan_kurasi: TULIS DULU — alasan singkat berbasis aturan (sebutkan pagu, metode, dan jenis bila relevan).
- status_kurasi: TULIS BELAKANGAN, dan HARUS merupakan kesimpulan langsung dari catatan_kurasi yang baru saja Anda tulis — jangan pernah bertentangan dengannya.
- rekomendasi_kurasi: saran metode yang seharusnya bila "Tidak Akurat" (atau pengingat SPSE bila relevan). Jika "Belum Dikurasi", sarankan "Perlu reviu manual dokumen pemilihan". Isi "-" HANYA bila murni "Akurat" dan tidak butuh pengingat SPSE.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kd_rup } = body;

    if (!kd_rup) {
      return NextResponse.json({ error: 'kd_rup harus disediakan.' }, { status: 400 });
    }

    const supabase = await getApiSupabase();
    
    // Fetch from penyedia first
    let res = await supabase.from('view_paket_penyedia_master_data').select('kd_rup, rup_name:nama_paket, pagu, metode_pengadaan, jenis_pengadaan, status_dikecualikan, tipe_paket, nama_ppk, satker:"SATUAN KERJA"').eq('kd_rup', kd_rup).maybeSingle();
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
      tipe: isSwakelola ? (dataPaket as any).tipe_swakelola : (dataPaket as any).tipe_paket,
      nama_ppk: dataPaket.nama_ppk,
      satker: dataPaket.satker,
      ...(isSwakelola ? {
        nama_satker_penyelenggara: (dataPaket as any).nama_satker_penyelenggara,
        nama_klpd_penyelenggara: (dataPaket as any).nama_klpd_penyelenggara,
      } : {})
    };

    // Pengecekan Swakelola yang bisa dinilai langsung tanpa AI (seperti di batch logic)
    let forceAkurat = false;
    let forceTidakAkurat = false;
    let fallbackCatatan = "";
    let fallbackRekomendasi = "";

    if (isSwakelola) {
      const { rup_name, nama_satker_penyelenggara, nama_klpd_penyelenggara } = inputData;
      const lowerName = (rup_name || '').toLowerCase();
      if (lowerName.includes('honor') || lowerName.includes('uang saku')) {
        forceTidakAkurat = true;
        fallbackCatatan = "Honorarium atau uang saku adalah komponen belanja pegawai/kompensasi personal, bukan objek Pengadaan Barang/Jasa menurut Perpres No. 46 Tahun 2025. Tidak tepat dicatat sebagai paket Swakelola.";
        fallbackRekomendasi = "Keluarkan dari RUP dan bayarkan melalui mekanisme belanja pegawai.";
      } else if (nama_satker_penyelenggara && nama_klpd_penyelenggara) {
        forceAkurat = true;
        fallbackCatatan = `Pelaksanaan Swakelola sudah sesuai dengan mencantumkan instansi penyelenggara: ${nama_satker_penyelenggara} (${nama_klpd_penyelenggara}).`;
        fallbackRekomendasi = "Sudah Sesuai";
      } else {
        forceTidakAkurat = true;
        fallbackCatatan = "Data K/L/PD dan Satker Penyelenggara kosong sehingga skema pelaksanaan Swakelola Tipe lain tidak dapat divalidasi dengan baik.";
        fallbackRekomendasi = "Lengkapi data instansi penyelenggara agar skema pelaksanaan Swakelola dapat divalidasi.";
      }
    }

    const payloadText = JSON.stringify([inputData], null, 2);

    let aiResult;
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: `Lakukan kurasi untuk paket berikut:\n\n${payloadText}` }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0,
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
                    catatan_kurasi: { type: "STRING" },
                    status_kurasi: { type: "STRING", enum: ["Akurat", "Tidak Akurat", "Belum Dikurasi"] },
                    rekomendasi_kurasi: { type: "STRING" },
                  },
                  required: ["kd_rup", "catatan_kurasi", "status_kurasi", "rekomendasi_kurasi"]
                }
              }
            },
            required: ["hasil"]
          },
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

    const finalStatus = forceAkurat ? 'Akurat' : forceTidakAkurat ? 'Tidak Akurat' : item.status_kurasi;
    const finalCatatan = (forceAkurat || forceTidakAkurat) ? fallbackCatatan : item.catatan_kurasi;
    const finalRekomendasi = (forceAkurat || forceTidakAkurat) ? fallbackRekomendasi : item.rekomendasi_kurasi;

    // Jaring pengaman: kalau bukan hasil override deterministik (Swakelola) dan kesimpulan
    // yang ditulis AI sendiri di catatan_kurasi bertentangan dengan tag status_kurasi-nya,
    // jangan simpan hasil yang salah — minta user coba kurasi ulang.
    if (!forceAkurat && !forceTidakAkurat && detectStatusConflict(item.catatan_kurasi, item.status_kurasi)) {
      return NextResponse.json(
        { error: 'Hasil AI tidak konsisten (catatan dan status bertentangan). Silakan coba "Kurasi Ulang" sekali lagi.' },
        { status: 409 }
      );
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
