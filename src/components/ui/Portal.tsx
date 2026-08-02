"use client";

import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Merender anaknya langsung ke <body>, di luar pohon halaman.
 *
 * Overlay modal di aplikasi ini memakai `position: fixed`, dan fixed hanya
 * mengacu ke viewport selama TIDAK ada leluhur yang punya transform, filter,
 * perspective, backdrop-filter, atau will-change atasnya. Padahal modal di sini
 * bersarang di dalam beberapa lapis elemen yang justru dianimasikan: wadah
 * PageTransition, dan akar tiap view yang kebanyakan berupa motion.div. Begitu
 * salah satu leluhur itu punya transform, overlay berhenti menutupi layar dan
 * mulai mengacu ke kotak leluhurnya, sehingga tampil melenceng dan terpotong.
 *
 * Dipindah ke body, modal kebal terhadap seluruh animasi tersebut, sekarang
 * maupun nanti.
 *
 * Tidak memakai state + useEffect untuk menunggu mount: modal hanya dirender
 * saat terbuka, dan itu selalu akibat interaksi di klien, jadi cukup dijaga
 * dengan ketiadaan `document` di server tanpa risiko mismatch hidrasi.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
