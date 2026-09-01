/**
 * Target realisasi kumulatif per triwulan, dalam persen dari pagu.
 *
 * Angka ini sudah lebih dulu dipakai kartu "Sudah Realisasi" di KpiCards untuk
 * menandai tercapai/di bawah target. Kurva realisasi memakai angka yang SAMA
 * dari sini: dua tempat yang menilai hal yang sama dengan dua deret angka
 * berbeda adalah cara tercepat membuat satu halaman menyanggah dirinya sendiri.
 *
 * Tidak ada sumber target di basis data — tidak ada tabel maupun kolomnya — jadi
 * deret ini adalah kebijakan yang ditulis di kode, bukan data yang diambil.
 * Ubah di sini kalau angka resminya berubah.
 *
 * Indeks 0 = TW1.
 */
export const TARGET_TRIWULAN = [20, 50, 80, 100] as const;

/** Triwulan (1-4) tempat sebuah tanggal jatuh. */
export function triwulanDari(d: Date): 1 | 2 | 3 | 4 {
  return (Math.floor(d.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

/**
 * Triwulan berjalan menurut tanggal saat ini. Halaman Ringkasan tidak punya
 * pemilih periode, jadi acuannya kalender.
 */
export function triwulanBerjalan(now: Date = new Date()): 1 | 2 | 3 | 4 {
  return triwulanDari(now);
}

/**
 * Triwulan terakhir yang sudah TUNTAS, atau null selama TW1.
 *
 * Triwulan berjalan belum selesai, jadi menilainya sama saja menghukum satker
 * karena belum menyelesaikan waktu yang memang belum lewat: di TW3 yang dilihat
 * capaian target TW2.
 */
export function triwulanDinilai(now: Date = new Date()): 1 | 2 | 3 | null {
  const tw = triwulanBerjalan(now);
  return tw > 1 ? ((tw - 1) as 1 | 2 | 3) : null;
}

/** Persen target untuk triwulan yang sedang dinilai, atau null selama TW1. */
export function targetDinilai(now: Date = new Date()): number | null {
  const tw = triwulanDinilai(now);
  return tw === null ? null : TARGET_TRIWULAN[tw - 1];
}
