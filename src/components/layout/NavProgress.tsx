"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import styles from './NavProgress.module.css';

const EASE = [0.22, 1, 0.36, 1] as const; // mirror --ease-out di globals.css

/**
 * Bar progres tipis di atas layar (gaya YouTube/GitHub/Notion) — umpan balik
 * instan begitu link diklik, sebelum halaman baru selesai dimuat.
 *
 * Next.js App Router tidak punya event "navigasi dimulai" untuk <Link>, jadi
 * progres dipicu dari klik <a> di level document, dan diselesaikan begitu
 * usePathname() berubah (halaman baru sudah commit).
 *
 * Sengaja HANYA mendengar klik <a> (mencakup seluruh <Link> Next.js —
 * Sidebar, Topbar, drilldown). Navigasi lewat router.push() terprogram (mis.
 * CommandPalette, klik chart) tidak dicakup: sebagian dari itu cuma
 * memperbarui query string di halaman yang sama (filter), bukan pindah
 * halaman, dan memicu bar ini di situ akan menyesatkan.
 */
export function NavProgress() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) return; // sudah berjalan
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setVisible(true);
    setProgress(0.08);
    // Mendekati 90% tanpa pernah sampai -- menunggu commit halaman baru untuk
    // menyelesaikannya ke 100%. Trik standar progress bar navigasi.
    intervalRef.current = setInterval(() => {
      setProgress((p) => (p < 0.9 ? p + (0.9 - p) * 0.12 : p));
    }, 180);
  }, []);

  const finish = useCallback(() => {
    if (!intervalRef.current) return; // tidak ada navigasi yang sedang berjalan
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setProgress(1);
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  }, []);

  // Halaman baru sudah commit -> selesaikan progres yang sedang berjalan.
  // (Tidak melakukan apa pun kalau tidak ada progres yang dipicu, mis. mount pertama.)
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // filter/anchor di halaman yang sama
      start();
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [start]);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    },
    []
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.track}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          aria-hidden="true"
        >
          <motion.div
            className={styles.fill}
            animate={{ scaleX: progress }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
