"use client";

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const EASE = [0.22, 1, 0.36, 1] as const; // mirror --ease-out / --ease-spring di globals.css
const DUR_ENTER = 0.28; // mirror --dur-med — dashboard yang dibuka berulang kali, bukan tontonan
const DUR_EXIT = 0.15; // mirror --dur-fast

/**
 * Animasi transisi antar-halaman: wadah halaman keluar (fade cepat) lalu
 * halaman baru masuk (fade+naik tipis), lalu akar tiap view melanjutkan
 * dengan stagger-nya sendiri.
 *
 * WAJIB dipasang SEKALI di Shell (membungkus {children}), BUKAN per halaman.
 * Versi lama dipasang di tiap page.tsx sendiri-sendiri — AnimatePresence di
 * situ tidak pernah berfungsi karena Next.js meng-unmount seluruh subtree
 * halaman lama (termasuk instance PageTransition-nya) sebelum instance baru
 * sempat mount, jadi animasi exit tidak pernah sempat jalan. Shell.tsx
 * dirender oleh layout persisten (app)/layout.tsx dan TIDAK ikut ter-unmount
 * saat pindah rute — hanya {children} (isi rute) yang berganti — sehingga
 * AnimatePresence di sini benar-benar melihat isi lama keluar dan isi baru
 * masuk.
 *
 * JANGAN menambahkan @keyframes ke anak langsung wadah ini. Deklarasi animasi
 * CSS menang atas atribut style, jadi keyframes semacam itu menimpa transform
 * inline yang dipasang framer pada akar view (semuanya motion.div), dan dengan
 * fill-mode `both` timpaan itu bertahan selamanya, bukan cuma selama animasi.
 */
const variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR_ENTER, ease: EASE } },
  // Exit lebih cepat dari entrance -- keluar duluan, jangan menahan pengguna.
  exit: { opacity: 0, transition: { duration: DUR_EXIT, ease: EASE } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial={reduce ? false : 'initial'}
        animate="animate"
        exit={reduce ? undefined : 'exit'}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
