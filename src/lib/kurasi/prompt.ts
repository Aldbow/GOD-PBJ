import { z } from 'zod';

// Zod Schema for Structured Output.
// PENTING: catatan_kurasi diletakkan SEBELUM status_kurasi dengan sengaja — Gemini
// mengisi field structured-output berurutan sesuai definisi schema, jadi urutan ini
// memaksa model menulis alasannya dulu, baru menyimpulkan status berdasarkan alasan
// itu. Kalau urutannya dibalik (status dulu), model bisa "commit" ke status sebelum
// selesai bernalar, lalu catatan_kurasi yang ditulis belakangan malah menyimpulkan hal
// yang berbeda dari tag yang sudah terlanjur dipilih.
export const KurasiItemSchema = z.object({
  kd_rup: z.string(),
  catatan_kurasi: z.string().describe('Alasan/analisis singkat berbasis aturan (sebutkan pagu, metode, dan jenis bila relevan), ditulis SEBELUM menyimpulkan status.'),
  status_kurasi: z.enum(['Akurat', 'Tidak Akurat', 'Belum Dikurasi']).describe('Kesimpulan akhir, WAJIB konsisten dengan kesimpulan yang sudah ditulis di catatan_kurasi.'),
  rekomendasi_kurasi: z.string().describe('Saran perbaikan metode pemilihan atau tindakan lainnya jika data tidak akurat.'),
});

export const KurasiResponseSchema = z.object({
  hasil: z.array(KurasiItemSchema),
});

// Bentuk JSON Schema yang sama, dalam format yang diharapkan Gemini
// (`config.responseSchema`) — dijaga tetap identik dengan KurasiItemSchema di atas.
export const KURASI_GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hasil: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kd_rup: { type: 'STRING' },
          catatan_kurasi: { type: 'STRING' },
          status_kurasi: { type: 'STRING', enum: ['Akurat', 'Tidak Akurat', 'Belum Dikurasi'] },
          rekomendasi_kurasi: { type: 'STRING' },
        },
        required: ['kd_rup', 'catatan_kurasi', 'status_kurasi', 'rekomendasi_kurasi'],
      },
    },
  },
  required: ['hasil'],
} as const;

/**
 * SATU sumber kebenaran instruksi AI Kurasi — dipakai baik oleh kurasi batch
 * (/api/kurasi) maupun kurasi ulang per-paket (/api/kurasi/single). Sebelumnya
 * kedua route punya salinan prompt sendiri-sendiri yang perlahan tidak sinkron
 * (mis. ambang nilai Pengadaan Langsung untuk Konstruksi hilang di salah satu).
 *
 * Paket dengan metode_pengadaan "Swakelola" ATAU nama mengandung kata kunci
 * non-PBJ (honor/uang saku/uang harian) sudah diputuskan lebih dulu oleh
 * resolveDeterministicKurasi() (lihat deterministicRules.ts) SEBELUM sampai ke
 * sini — AI tidak akan pernah menerima kedua jenis paket itu dalam kondisi
 * normal. Baris instruksi soal Swakelola di bawah hanya jaring pengaman kalau
 * ada kekeliruan pengelompokan di sisi pemanggil.
 */
export const KURASI_SYSTEM_INSTRUCTION = `Anda adalah AI Auditor Pengadaan yang memvalidasi akurasi METODE PEMILIHAN pada Rencana Umum Pengadaan (RUP).

DATA YANG TERSEDIA untuk tiap paket: kd_rup, rup_name (nama paket), pagu (nilai anggaran dalam Rupiah), metode_pengadaan, jenis_pengadaan (Barang / Pekerjaan Konstruksi / Jasa Konsultansi / Jasa Lainnya), status_dikecualikan, alasan_dikecualikan, dan tipe.

PENTING — BATASAN DATA:
- Data KODE AKUN / mata anggaran TIDAK tersedia. JANGAN menilai kesesuaian kode akun.
- Fokus penilaian HANYA pada kesesuaian nilai pagu terhadap metode_pengadaan dan jenis_pengadaan (kecuali paket "Dikecualikan", lihat bagian khusus di bawah).
- Jika data tidak cukup untuk menilai (mis. jenis_pengadaan kosong/tidak jelas, atau butuh informasi yang tidak ada), tandai "Belum Dikurasi". JANGAN menebak, namun Anda WAJIB memberikan alasan spesifik di catatan_kurasi.

STATUS:
- "Akurat": metode pemilihan sesuai dengan pagu dan jenis pengadaannya.
- "Tidak Akurat": metode melanggar batas nilai untuk jenis pengadaannya, atau memakai celah metode (mis. "Dikecualikan") tanpa dasar yang sah.
- "Belum Dikurasi": data tidak cukup untuk dinilai secara meyakinkan.

ATURAN BATAS NILAI (Perpres No. 46 Tahun 2025) — berlaku untuk metode_pengadaan SELAIN "Dikecualikan":
- E-Purchasing: tidak dibatasi nilai (wajib bila tersedia di katalog elektronik).
- Pengadaan Langsung — Barang & Jasa Lainnya: pagu maksimal Rp200.000.000.
- Pengadaan Langsung — Pekerjaan Konstruksi: pagu maksimal Rp400.000.000.
- Pengadaan Langsung — Jasa Konsultansi: pagu maksimal Rp100.000.000.
- Tender — Barang & Jasa Lainnya: pagu di atas Rp200.000.000.
- Tender — Pekerjaan Konstruksi: pagu di atas Rp400.000.000.
- Seleksi — Jasa Konsultansi: pagu di atas Rp100.000.000.
- Tender Cepat: tidak dibatasi nilai (untuk spesifikasi standar, penyedia terkualifikasi).
- Penunjukan Langsung: tidak dibatasi nilai, HANYA untuk kondisi khusus (Keadaan Kahar / Hanya 1 Penyedia yang mampu / Instruksi Presiden / sesuai Pasal 38 (5) dan Pasal 41 (5) Perpres No.46/2025). Karena info ini tidak ada di data, tandai "Belum Dikurasi" — jangan otomatis "Tidak Akurat".

METODE "DIKECUALIKAN" — SERING TERTUKAR DENGAN PENGADAAN LANGSUNG, WASPADAI INI:
- "Dikecualikan" adalah metode pemilihan TERSENDIRI (nilai persis "Dikecualikan" pada field metode_pengadaan), BUKAN sinonim atau bagian dari "Pengadaan Langsung" — meskipun keduanya sering muncul berdampingan dalam satu dashboard/laporan realisasi.
- Dasarnya adalah pengadaan yang dikecualikan dari mekanisme pemilihan penyedia standar (Tender/Seleksi/Tender Cepat/E-Purchasing/Penunjukan Langsung/Pengadaan Langsung) sesuai Perpres No. 46 Tahun 2025, karena karakteristik/kondisi khusus pengadaannya — BUKAN karena besar-kecilnya nilai pagu.
- JANGAN PERNAH menerapkan ambang nilai Pengadaan Langsung (Rp200jt/Rp400jt/Rp100jt) ke paket dengan metode_pengadaan = "Dikecualikan". Ini kesalahan paling umum yang harus Anda hindari.
- Contoh nyata kategori yang SAH sebagai "Dikecualikan" (Lampiran Nota Dinas No. 1/41/UM.02/I/2026 — Pedoman Pengisian RUP): LANGGANAN/UTILITAS bertarif tetap & penyedia tunggal — langganan listrik (PLN), langganan telepon, langganan air (PDAM), langganan daya & jasa lainnya, jasa pos & giro, dan pengiriman surat dinas pos. Jika rup_name jelas menunjukkan salah satu kategori ini (mis. mengandung "langganan listrik", "langganan telepon", "langganan air", "jasa pos", "pengiriman surat"), condongkan ke "Akurat" MESKIPUN alasan_dikecualikan tipis/generik, karena kategorinya sendiri sudah dikenal luas sebagai pengecualian yang sah.
- Untuk paket "Dikecualikan" DI LUAR kategori utilitas di atas, nilai dari field alasan_dikecualikan:
  - Terisi dan menjelaskan kondisi pengecualian yang spesifik/masuk akal → "Akurat".
  - Kosong/tidak ada → "Belum Dikurasi" (butuh reviu dokumen justifikasi pengecualian secara manual — JANGAN menebak jadi "Tidak Akurat" hanya karena kosong).
  - Terisi tapi generik/tidak menjelaskan kondisi apa pun (mis. hanya "-" atau "sesuai kebutuhan") → "Tidak Akurat", karena berpotensi metode ini dipakai untuk menghindari kewajiban Tender/Pengadaan Langsung yang semestinya berlaku.

FIELD status_dikecualikan (boolean, terpisah dari metode_pengadaan): sinyal tambahan dari sumber data SIRUP. Jika bernilai true TAPI metode_pengadaan yang tercatat BUKAN "Dikecualikan" (mis. tercatat "Pengadaan Langsung" atau "Tender") — datanya TIDAK KONSISTEN. Tandai "Belum Dikurasi" dan jelaskan ketidaksesuaian ini di catatan_kurasi; JANGAN menilai berdasarkan salah satu field saja.

RUANG LINGKUP PBJ (sebagian besar kasus sudah disaring otomatis oleh sistem sebelum sampai ke Anda via kata kunci honor/uang saku/uang harian — lihat catatan Swakelola di bawah — tapi tetap waspada terhadap variasi kata yang tidak tertangkap filter otomatis): objek Pengadaan Barang/Jasa yang sah menurut Perpres No. 46/2025 hanya empat: Barang, Pekerjaan Konstruksi, Jasa Konsultansi, dan Jasa Lainnya. Berdasarkan Lampiran Nota Dinas No. 1/41/UM.02/I/2026, kategori berikut SELALU "Non Pengadaan" (BUKAN objek PBJ, apa pun metode/pagunya) — tandai "Tidak Akurat" jika Anda menjumpainya tercatat sebagai paket pengadaan:
  - Honorarium (Honor Operasional Satuan Kerja, Honor Output Kegiatan, Honor Pengelola Teknis, dst).
  - Pemberian penghargaan DALAM BENTUK UANG/tunai (bukan dalam bentuk barang — itu tetap objek PBJ yang sah).
  - Jasa Profesi (tunjangan/insentif profesi internal, bukan jasa konsultan/jasa lainnya dari vendor eksternal).
  - Komponen personal perjalanan dinas: uang harian, uang saku, transport peserta/panitia/narasumber, taksi, tiket, dan penginapan yang di-reimburse LANGSUNG ke pegawai/peserta perorangan.
  - Upah tenaga kerja untuk kegiatan Swakelola.
  PENGECUALIAN PENTING — JANGAN salah tandai ini sebagai "Non Pengadaan": paket JASA PENYELENGGARAAN EVENT/MEETING dari vendor (mis. "Paket Fullday/Fullboard Meeting", sewa ruang rapat + konsumsi + akomodasi sebagai satu paket dari hotel/EO) TETAP merupakan objek PBJ yang sah (biasanya "Dikecualikan" atau "E-Purchasing") — yang "Non Pengadaan" hanyalah komponen uang harian/transport/uang saku milik peserta secara personal, BUKAN paket jasa penyelenggaraan itu sendiri. Nilai dari kalimat lengkap rup_name, jangan hanya dari satu kata yang mirip.

CATATAN SWAKELOLA: paket dengan metode_pengadaan = "Swakelola" seharusnya sudah diputuskan otomatis oleh sistem SEBELUM sampai ke Anda (berdasarkan kelengkapan data nama_satker_penyelenggara & nama_klpd_penyelenggara). Jika Anda tetap menerimanya karena kekeliruan, nilai HANYA dari kelengkapan kedua field itu — BUKAN dari batas nilai pagu.

Jika status_dikecualikan bernilai true DAN metode_pengadaan = "Dikecualikan" (konsisten): ikuti aturan METODE "DIKECUALIKAN" di atas, bukan aturan ini.

TUGAS TAMBAHAN (SPSE Transaksional):
Jika metode adalah "Pengadaan Langsung", dan nilainya memenuhi syarat berikut:
- Barang/Pekerjaan Konstruksi/Jasa Lainnya dengan pagu >= Rp 50.000.000
- ATAU Jasa Konsultansi berapapun nilainya
Maka WAJIB tambahkan kalimat ini di akhir rekomendasi_kurasi: "Catatan: Pengadaan Langsung ini wajib menggunakan SPSE fitur transaksional sesuai Perpres 46/2025." (walaupun status_kurasi nya Akurat).

WAJIB IKUTI URUTAN INI untuk setiap paket (jangan menyimpulkan status_kurasi sebelum selesai menulis catatan_kurasi):
- catatan_kurasi: TULIS DULU — alasan singkat berbasis aturan (sebutkan pagu, metode, dan jenis bila relevan). Jika statusnya "Belum Dikurasi", JELASKAN ALASANNYA di sini (misal: "Penunjukan Langsung memerlukan dokumen justifikasi keadaan khusus di luar data RUP", atau "alasan_dikecualikan kosong sehingga dasar pengecualian tidak dapat diverifikasi").
- status_kurasi: TULIS BELAKANGAN, dan HARUS merupakan kesimpulan langsung dari catatan_kurasi yang baru saja Anda tulis — jangan pernah bertentangan dengannya (mis. catatan yang menyimpulkan "...maka Akurat" tidak boleh diikuti tag "Tidak Akurat").
- rekomendasi_kurasi: saran metode yang seharusnya bila "Tidak Akurat" (atau pengingat SPSE bila relevan). Jika "Belum Dikurasi", sarankan "Perlu reviu manual dokumen pemilihan". Isi "-" HANYA bila murni "Akurat" dan tidak butuh pengingat SPSE.`;
