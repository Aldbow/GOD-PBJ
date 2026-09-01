"use client";

/**
 * Menulis ulang query string tanpa menjalankan navigasi Next.js.
 *
 * Semua filter dasbor ini disaring di klien; URL-nya cuma ada supaya tautannya
 * bisa dibagikan. `router.replace` memperlakukan perubahan filter sebagai
 * perpindahan halaman: satu Transition penuh plus permintaan RSC untuk segmen
 * yang sama, per perubahan. Untuk kotak pencarian akibatnya fatal — nilai `q`
 * kembali dari router terlambat dan tidak selalu berurutan, jadi ketikan yang
 * lebih baru tertimpa gema yang lebih lama dan huruf terlihat terhapus sendiri.
 *
 * `history.replaceState` didukung resmi App Router (lihat "Native History API"
 * di docs linking-and-navigating) dan ikut menyinkronkan `useSearchParams`,
 * tanpa transition dan tanpa permintaan jaringan.
 *
 * Params dibaca dari `window.location`, bukan dari `useSearchParams()`, supaya
 * dua penulisan dalam satu tick tidak saling menghapus lewat snapshot basi —
 * dan supaya pemanggilnya tidak perlu menaruh searchParams di dependensi.
 */
export function replaceQueryParams(mutate: (params: URLSearchParams) => void): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  mutate(params);
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}
