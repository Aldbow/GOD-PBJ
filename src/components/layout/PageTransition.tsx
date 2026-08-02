"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Animasi masuk untuk setiap fitur DEWA-PBJ: wadah halaman naik dan memudar
 * masuk, lalu akar tiap view melanjutkan dengan stagger-nya sendiri.
 *
 * AnimatePresence sebelumnya dipakai di sini tapi tidak pernah berfungsi: tiap
 * halaman merender instance PageTransition-nya sendiri, jadi saat pindah route
 * seluruh subtree lama ikut ter-unmount dan animasi exit tidak pernah sempat
 * jalan. Dibuang karena kode mati.
 *
 * JANGAN menambahkan @keyframes ke anak langsung wadah ini. Deklarasi animasi
 * CSS menang atas atribut style, jadi keyframes semacam itu menimpa transform
 * inline yang dipasang framer pada akar view (semuanya motion.div), dan dengan
 * fill-mode `both` timpaan itu bertahan selamanya, bukan cuma selama animasi.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE }}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      {children}
    </motion.div>
  );
}
