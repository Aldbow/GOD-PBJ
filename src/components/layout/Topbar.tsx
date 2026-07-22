"use client";

import React, { useEffect, useRef, useState } from 'react';
import styles from './Topbar.module.css';

import { ThemeToggle } from './ThemeToggle';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Search, ChevronRight, RadioTower } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { ROLE_LABEL } from '@/lib/auth/access';
import { logout } from '@/lib/auth/actions';
import { findActiveEntry } from '@/lib/nav';
import { CommandPalette } from './CommandPalette';

export function Topbar() {
  const pathname = usePathname();
  const { full_name, role } = useSession();
  const [spseSync, setSpseSync] = useState('');
  const [sirupSync, setSirupSync] = useState('');
  const [syncOpen, setSyncOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const syncRef = useRef<HTMLDivElement>(null);

  const activeEntry = findActiveEntry(pathname);
  const title = activeEntry?.link.name ?? 'Ringkasan Kementerian';
  const breadcrumbGroup = activeEntry?.group.label;

  // Mock sync timers
  useEffect(() => {
    const spseStart = Date.now() - 4 * 60 * 1000;
    const sirupStart = Date.now() - 38 * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const fmt = (start: number) => {
        const diff = Math.floor((now - start) / 1000);
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        return `${m}m ${String(s).padStart(2, '0')}d lalu`;
      };
      setSpseSync(fmt(spseStart));
      setSirupSync(fmt(sirupStart));
    };

    tick();
    const intv = setInterval(tick, 1000);
    return () => clearInterval(intv);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (syncRef.current && !syncRef.current.contains(e.target as Node)) setSyncOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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
    <header className={styles.topbar}>
      <div className={styles.titleWrap}>
        <div className={styles.breadcrumb}>
          <span className={styles.eyebrow}>DEWA-PBJ</span>
          {breadcrumbGroup && (
            <>
              <ChevronRight size={11} className={styles.crumbSep} />
              <span className={styles.crumbGroup}>{breadcrumbGroup}</span>
            </>
          )}
        </div>
        <h1>{title}</h1>
      </div>
      <div className={styles.controlsRow}>
        <button
          type="button"
          className={styles.searchBtn}
          onClick={() => setPaletteOpen(true)}
        >
          <Search size={14} />
          <span>Cari halaman…</span>
          <kbd className={styles.kbd}>Ctrl K</kbd>
        </button>

        <div className={styles.syncWrap} ref={syncRef}>
          <button
            type="button"
            className={styles.syncBadge}
            onClick={() => setSyncOpen((v) => !v)}
            aria-expanded={syncOpen}
          >
            <RadioTower size={13} />
            <span>2 sumber tersinkron</span>
          </button>
          <AnimatePresence>
            {syncOpen && (
              <motion.div
                className={styles.syncPopover}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={styles.syncItem}>
                  <span className={`${styles.dot} ${styles.ok}`} />
                  <span className={styles.syncLabel}>SPSE</span>
                  <span className={styles.mono}>tersinkron {spseSync}</span>
                </div>
                <div className={styles.syncItem}>
                  <span className={`${styles.dot} ${styles.warn}`} />
                  <span className={styles.syncLabel}>SIRUP</span>
                  <span className={styles.mono}>tersinkron {sirupSync}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ThemeToggle />

        <div className={styles.userChip}>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{full_name}</span>
            <span className={styles.userRole}>{ROLE_LABEL[role]}</span>
          </div>
          <form action={logout}>
            <button type="submit" className={styles.logoutBtn} aria-label="Keluar" title="Keluar">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
