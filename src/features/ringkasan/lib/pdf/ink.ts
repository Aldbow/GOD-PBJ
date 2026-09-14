/**
 * Palet tinta untuk seluruh cetakan PDF halaman Ringkasan.
 *
 * SELALU tema terang, apa pun tema aplikasi yang sedang aktif. Cetakan adalah
 * dokumen kertas, bukan tangkapan layar: laporan bertema gelap boros tinta,
 * tidak terbaca di fotokopi, dan berubah rupa hanya karena orang yang mencetak
 * kebetulan memakai mode gelap. Nilainya sengaja dijaga sama dengan yang sudah
 * dipakai `cetakPeringkatSatker.ts` supaya dua cetakan dari halaman yang sama
 * tidak terlihat berasal dari dua aplikasi berbeda.
 */

export type RGB = [number, number, number];

export const INK = {
  /** Judul & angka penting. slate-900 */
  heading: [15, 23, 42] as RGB,
  /** Teks isi. slate-700 */
  body: [51, 65, 85] as RGB,
  /** Keterangan, satuan, catatan kaki. slate-500 */
  muted: [100, 116, 139] as RGB,
  /** Teks paling redup — label sumbu, watermark halaman. slate-400 */
  faint: [148, 163, 184] as RGB,

  /** Garis pemisah utama. slate-300 */
  rule: [203, 213, 225] as RGB,
  /** Garis pemisah halus di dalam panel/tabel. slate-200 */
  ruleSoft: [226, 232, 240] as RGB,

  /** Latar kertas. */
  paper: [255, 255, 255] as RGB,
  /** Latar panel/kartu. slate-50 */
  panel: [248, 250, 252] as RGB,
  /** Latar zebra baris tabel. slate-50 */
  zebra: [248, 250, 252] as RGB,
  /** Latar kepala tabel — samakan dengan exportToPDF & cetakPeringkatSatker. */
  headFill: [31, 41, 55] as RGB,
  /** Sorotan baris (satker milik pembaca). blue-50 */
  highlight: [239, 246, 255] as RGB,

  /** Aksen merek — sama dengan SLOT.blue mode terang di chartTheme. */
  accent: [42, 120, 214] as RGB,
  /** Batang "sisa"/latar track pada bar vektor. slate-200 */
  track: [226, 232, 240] as RGB,
} as const;

/** Ambang warna % capaian — identik dengan badge di layar & cetakan peringkat. */
export function capaianInk(pct: number): RGB {
  if (pct < 25) return [185, 28, 28]; // red-700
  if (pct < 50) return [180, 83, 9]; // amber-700
  if (pct < 75) return [29, 78, 216]; // blue-700
  return [21, 128, 61]; // green-700
}

/** '#2a78d6' -> [42, 120, 214]. Mengembalikan abu-abu netral bila bukan hex. */
export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [148, 163, 184];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Campur warna ke arah putih — untuk latar lembut sewarna kategorinya. */
export function tint(rgb: RGB, amount: number): RGB {
  const k = Math.max(0, Math.min(1, amount));
  return rgb.map((c) => Math.round(c + (255 - c) * k)) as RGB;
}

/** Stempel waktu Indonesia: "26 Agustus 2026, 14:03 WIB". */
export function stamp(d: Date): string {
  const tanggal = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${tanggal}, ${jam} WIB`;
}
