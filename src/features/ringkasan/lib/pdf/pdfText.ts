/**
 * Penjinak teks sebelum masuk ke jsPDF.
 *
 * Font bawaan PDF (helvetica) memakai WinAnsiEncoding — satu byte per huruf.
 * jsPDF memetakan sebagian kecil karakter di atas U+00FF ke byte WinAnsi
 * (em dash, elipsis, kutip miring, bullet — 27 buah, lihat WINANSI_EXTRAS).
 * Karakter di luar itu TIDAK dipetakan, dan begitu ada satu saja yang tersisa,
 * jsPDF mengodekan ulang SELURUH string menjadi UCS-2 BE: tiap huruf jadi dua
 * byte, dan byte tingginya ikut digambar sebagai glyph.
 *
 * Akibatnya dua-duanya buruk sekaligus:
 *  1. Teksnya berubah jadi sampah — "→ Ubah metode" tergambar "!  U b a h".
 *  2. Lebarnya membengkak ~2x SESUDAH tata letak selesai dihitung. Semua
 *     pengukuran (getTextWidth, splitTextToSize, minReadableWidth milik
 *     autoTable) bekerja pada string logis, jadi kolom sudah terlanjur
 *     dialokasikan setengah dari yang benar-benar digambar — teksnya lalu
 *     menjulur keluar sel. Ini yang terlihat di kolom Catatan & Rekomendasi.
 *
 * Karena itu penjinakan harus terjadi SEBELUM pengukuran, bukan sesudahnya.
 * Isi laporan sebagian datang dari data (nama paket, nama satker) dan sebagian
 * dari kurasi AI (catatan & rekomendasi) — keduanya bisa memuat panah, tanda
 * ≥, atau emoji kapan saja, jadi menambal satu karakter di templat tidak cukup.
 */

/**
 * Kode di atas U+00FF yang tetap aman karena dipetakan jsPDF ke byte WinAnsi.
 * Disalin dari `font.metadata.Unicode.encoding.WinAnsiEncoding`; ada uji yang
 * membandingkannya dengan peta jsPDF yang terpasang supaya tidak diam-diam
 * melenceng saat pustakanya dinaikkan versinya.
 */
export const WINANSI_EXTRAS: ReadonlySet<number> = new Set([
  0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017d, 0x017e, 0x0192, 0x02c6, 0x02dc,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2020, 0x2021,
  0x2022, 0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122,
]);

/**
 * Padanan untuk simbol yang lazim muncul di data tapi tidak dipetakan jsPDF.
 * Dipilih yang maknanya bertahan di atas kertas, bukan sekadar dibuang.
 */
const TRANSLITERASI: Readonly<Record<string, string>> = {
  '→': '»',
  '←': '«',
  '⇒': '=>',
  '⇐': '<=',
  '↔': '<->',
  '≥': '>=',
  '≤': '<=',
  '≠': '!=',
  '≈': '~',
  '−': '-', // U+2212 minus matematis
  '‑': '-', // U+2011 hubung tanpa jeda
  '–': '-', // en dash: dipetakan jsPDF, tapi disamakan agar konsisten di tabel
  '✓': 'v',
  '✔': 'v',
  '✗': 'x',
  '★': '*',
  '➤': '»',
  '·': '·', // U+00B7, sudah < 256
};

/** Karakter tak terwakili diganti tanda ini — hilang diam-diam lebih berbahaya. */
const PENGGANTI = '?';

/**
 * Ubah `text` menjadi bentuk yang pasti ditulis jsPDF sebagai byte tunggal.
 *
 * Wajib dipanggil sebelum teks diukur maupun digambar. Pemanggilnya tidak perlu
 * ingat: `Paper` menjinakkan di `wrap()`, `widthOf()`, dan `textAt()`, dan
 * renderer tabel menjinakkan seluruh sel sebelum diserahkan ke autoTable.
 */
export function sanitizePdfText(text: string): string {
  let keluar = '';
  // Iterasi per titik kode, bukan per unit UTF-16, supaya pasangan pengganti
  // (emoji) tertangani sebagai satu karakter dan tidak menyisakan separuh.
  for (const ch of text) {
    const padanan = TRANSLITERASI[ch];
    if (padanan !== undefined) {
      keluar += padanan;
      continue;
    }

    const cp = ch.codePointAt(0) as number;

    if (ch === '\n') {
      keluar += ch; // dihormati autoTable sebagai jeda baris
      continue;
    }
    if (ch === '\t') {
      keluar += '  ';
      continue;
    }
    if (cp < 0x20 || cp === 0x7f) {
      keluar += ' '; // kendali lain tidak punya rupa di atas kertas
      continue;
    }
    // Spasi tanpa jeda & spasi tipografis: byte-nya aman, tapi pemenggal baris
    // tidak mengenalinya sebagai tempat memutus — jadikan spasi biasa supaya
    // kalimat panjang tetap bisa dibungkus di dalam sel.
    if (cp === 0xa0 || (cp >= 0x2000 && cp <= 0x200a) || cp === 0x202f) {
      keluar += ' ';
      continue;
    }
    if (cp === 0x200b || cp === 0x200c || cp === 0x200d || cp === 0xfeff) {
      continue; // lebar nol: tak berbekas, tapi memicu UCS-2
    }
    if (cp < 0x100 || WINANSI_EXTRAS.has(cp)) {
      keluar += ch;
      continue;
    }
    keluar += PENGGANTI;
  }
  return keluar;
}

/** Benar bila `text` bisa ditulis jsPDF tanpa jatuh ke UCS-2. */
export function isPdfSafe(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp >= 0x100 && !WINANSI_EXTRAS.has(cp)) return false;
  }
  return true;
}
