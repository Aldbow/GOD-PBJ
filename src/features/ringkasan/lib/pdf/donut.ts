import type { ProporsiItem } from './types';

/**
 * Donat proporsi untuk cetakan, digambar di kanvas lepas.
 *
 * Sengaja TIDAK memotret chart.js yang ada di layar. Chart di layar mewarisi
 * tema aktif (gelap/terang), legendanya HTML di luar kanvas, dan ukurannya
 * mengikuti lebar viewport — tiga hal yang membuat hasil cetak berbeda-beda
 * tergantung keadaan browser orang yang mencetak. Menggambar ulang di sini
 * membuat cetakan deterministik: warna kertas, ukuran tetap, dan tetap benar
 * walau seksinya sedang tergulung atau berada di luar layar.
 *
 * Ini satu-satunya raster di seluruh laporan, dan hanya beberapa kilobyte:
 * gambar polos tanpa teks, sedangkan legendanya ditulis sebagai teks vektor
 * oleh renderer supaya tetap tajam dan bisa dicari.
 */

/** Sisi kanvas dalam piksel. 3x ukuran cetak (±120pt) supaya tetap tajam. */
const PX = 420;
/** Tebal cincin sebagai porsi jari-jari luar. */
const RING = 0.36;

export function renderDonutPng(items: ProporsiItem[]): string | null {
  const positif = items.filter((i) => i.value > 0);
  if (positif.length === 0) return null;
  // Tanpa DOM (uji di Node, atau render di server) laporan tetap harus jadi —
  // renderer memperlakukan donat yang hilang sebagai ruang kosong, sedangkan
  // legenda beserta angkanya tetap tercetak sebagai teks.
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const total = positif.reduce((s, i) => s + i.value, 0);
  const cx = PX / 2;
  const cy = PX / 2;
  const rOuter = PX / 2 - 4;
  const rInner = rOuter * (1 - RING);

  // Latar kertas eksplisit: kanvas baru transparan, dan PNG transparan yang
  // ditempel jsPDF bisa menyisakan artefak gelap di sebagian penampil PDF.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PX, PX);

  let mulai = -Math.PI / 2; // jam 12
  for (const item of positif) {
    const sudut = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, mulai, mulai + sudut);
    ctx.arc(cx, cy, rInner, mulai + sudut, mulai, true);
    ctx.closePath();
    ctx.fillStyle = item.colorHex;
    ctx.fill();

    // Pemisah setipis rambut antar-potongan — tanpa ini dua kategori
    // bersebelahan dengan warna berdekatan terbaca sebagai satu potongan.
    if (positif.length > 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = PX * 0.006;
      ctx.stroke();
    }
    mulai += sudut;
  }

  return canvas.toDataURL('image/png');
}
