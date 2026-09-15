"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { CommandRail } from './CommandRail';
import { CommandPalette } from './CommandPalette';
import { Topbar } from './Topbar';
import { NavProgress } from './NavProgress';
import { PageTransition } from './PageTransition';
import styles from './Shell.module.css';

import { ScrollToTop } from '@/components/ui/ScrollToTop';

export function Shell({
  children,
  lastDataUpdate = null,
}: {
  children: React.ReactNode;
  /** ISO 8601 dari data_update_log; null bila belum ada catatan update. */
  lastDataUpdate?: string | null;
}) {
  /**
   * Palette dimiliki Shell, bukan Topbar. Sejak rail ikut bisa membukanya, dua
   * pemilik state berarti dua palette yang bisa terbuka bersamaan — dan pintasan
   * Ctrl+K hanya akan menyapa salah satunya.
   */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={styles.appShell}>
      <NavProgress />
      <CommandRail onOpenPalette={openPalette} />
      <main className={styles.mainArea}>
        <Topbar lastDataUpdate={lastDataUpdate} onOpenPalette={openPalette} />
        <PageTransition>{children}</PageTransition>
      </main>
      <ScrollToTop />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
