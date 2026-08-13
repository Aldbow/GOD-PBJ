// Aturan bisnis yang TIDAK boleh diserahkan ke penalaran AI (harus selalu sama
// hasilnya untuk input yang sama) — satu sumber kebenaran dipakai oleh
// src/app/api/kurasi/route.ts (batch) dan src/app/api/kurasi/single/route.ts,
// yang sebelumnya masing-masing punya salinan logika sendiri yang perlahan
// bergeser tidak sinkron satu sama lain.

export interface DeterministicRuleInput {
  metode_pengadaan: string | null | undefined;
  nama_paket: string | null | undefined;
  // Hanya relevan untuk Swakelola — kosong untuk paket Penyedia.
  nama_satker_penyelenggara?: string | null;
  nama_klpd_penyelenggara?: string | null;
}

export interface DeterministicRuleResult {
  status_kurasi: 'Akurat' | 'Tidak Akurat';
  catatan_kurasi: string;
  rekomendasi_kurasi: string;
}

// Kata kunci yang menandakan item BUKAN objek Pengadaan Barang/Jasa (Barang,
// Pekerjaan Konstruksi, Jasa Konsultansi, Jasa Lainnya) menurut ruang lingkup
// Perpres No. 46 Tahun 2025 — melainkan belanja pegawai/kompensasi personal.
// Dikonfirmasi via Lampiran Nota Dinas No. 1/41/UM.02/I/2026 (Pedoman Pengisian
// RUP — lihat docs/PEDOMAN-RUP-2026.md): "honor", "uang saku", dan "uang harian"
// SELALU "Non Pengadaan" di seluruh tabel akun tanpa satu pun pengecualian, jadi
// aman dijadikan filter deterministik. Kata lain yang muncul di dokumen itu
// (mis. "transport", "penginapan", "tiket") SENGAJA TIDAK dimasukkan ke sini
// karena bisa juga jadi bagian sah dari paket jasa penyelenggaraan event/meeting
// dari vendor (mis. "Paket Fullday/Fullboard Meeting" tetap objek PBJ) — kata-kata
// itu perlu penalaran kontekstual AI, bukan cocok-substring buta. Lihat instruksi
// "RUANG LINGKUP PBJ" di prompt.ts untuk penanganan kata-kata ambigu tersebut.
const NON_PBJ_KEYWORDS = ['honor', 'uang saku', 'uang harian'] as const;

export function containsNonPbjKeyword(namaPaket: string | null | undefined): boolean {
  if (!namaPaket) return false;
  const lower = namaPaket.toLowerCase();
  return NON_PBJ_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Kembalikan hasil kurasi yang sudah pasti (deterministik), atau `null` bila
 * paket ini harus diserahkan ke penalaran AI (mis. validasi ambang nilai per
 * metode, atau paket "Dikecualikan" yang butuh membaca alasan_dikecualikan).
 *
 * Berlaku untuk SEMUA sumber (Penyedia maupun Swakelola) — sebelumnya
 * pengecekan Honor/Uang Saku hanya jalan untuk Swakelola, padahal paket
 * Penyedia yang salah catat sebagai belanja pegawai sama tidak validnya.
 */
export function resolveDeterministicKurasi(input: DeterministicRuleInput): DeterministicRuleResult | null {
  const isSwakelola = input.metode_pengadaan === 'Swakelola';

  // Berlaku lebih dulu, mengalahkan aturan kelengkapan penyelenggara Swakelola
  // di bawah — Honorarium/Uang Saku bukan objek PBJ apa pun metodenya.
  if (containsNonPbjKeyword(input.nama_paket)) {
    return {
      status_kurasi: 'Tidak Akurat',
      catatan_kurasi:
        'Nama paket mengindikasikan komponen belanja pegawai/kompensasi personal (honorarium/uang saku), bukan objek Pengadaan Barang/Jasa (Barang, Pekerjaan Konstruksi, Jasa Konsultansi, atau Jasa Lainnya) sebagaimana ruang lingkup PBJ menurut Perpres No. 46 Tahun 2025.',
      rekomendasi_kurasi: isSwakelola
        ? 'Honorarium/Uang Saku sebaiknya dibayarkan melalui mekanisme belanja pegawai, bukan dicatat sebagai paket Swakelola pada RUP.'
        : 'Keluarkan dari RUP dan bayarkan melalui mekanisme belanja pegawai, bukan dicatat sebagai paket Pengadaan.',
    };
  }

  if (isSwakelola) {
    if (input.nama_satker_penyelenggara?.trim() && input.nama_klpd_penyelenggara?.trim()) {
      return {
        status_kurasi: 'Akurat',
        catatan_kurasi: `Pelaksanaan Swakelola sudah sesuai dengan mencantumkan instansi penyelenggara: ${input.nama_satker_penyelenggara} (${input.nama_klpd_penyelenggara}).`,
        rekomendasi_kurasi: 'Sudah Sesuai',
      };
    }
    return {
      status_kurasi: 'Tidak Akurat',
      catatan_kurasi:
        'Data K/L/PD dan Satker Penyelenggara kosong sehingga skema pelaksanaan Swakelola Tipe lain tidak dapat divalidasi dengan baik.',
      rekomendasi_kurasi: 'Lengkapi data Satker dan K/L/D Penyelenggara pada RUP agar skema pelaksanaan Swakelola dapat divalidasi.',
    };
  }

  // Termasuk metode "Dikecualikan": sengaja TIDAK diputuskan di sini karena
  // butuh membaca teks alasan_dikecualikan (bebas format, tidak bisa dicocokkan
  // dengan aturan pasti) — diserahkan ke AI mengikuti instruksi di prompt.ts.
  return null;
}
