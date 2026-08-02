"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import styles from './PageTransition.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Animasi masuk untuk setiap fitur DEWA-PBJ. Dua tahap: wadah halaman naik dan
 * memudar masuk, lalu blok-blok isinya menyusul berurutan (lihat module.css).
 *
 * AnimatePresence sebelumnya dipakai di sini tapi tidak pernah berfungsi: tiap
 * halaman merender instance PageTransition-nya sendiri, jadi saat pindah route
 * seluruh subtree lama ikut ter-unmount dan animasi exit tidak pernah sempat
 * jalan. Dibuang karena kode mati.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      className={reduce ? undefined : styles.page}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE }}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      {children}
    </motion.div>
  );
}
