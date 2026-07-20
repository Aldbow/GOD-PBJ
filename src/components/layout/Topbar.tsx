"use client";

import React, { useEffect, useState } from 'react';
import styles from './Topbar.module.css';

import { ThemeToggle } from './ThemeToggle';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { ROLE_LABEL } from '@/lib/auth/access';
import { logout } from '@/lib/auth/actions';

const TITLES: Record<string, string> = {
  '/': 'Ringkasan Kementerian',
  '/ppk': 'Tampilan PPK',
  '/drilldown': 'Drill-down Satuan Kerja',
  '/rencana-pengadaan': 'Rencana Umum Pengadaan',
  '/epurchasing': 'Realisasi E-Purchasing V6',
  '/tender': 'Realisasi Tender',
  '/pengadaan-langsung': 'Realisasi Pengadaan Langsung',
  '/penunjukan-langsung': 'Realisasi Penunjukan Langsung',
  '/swakelola': 'Realisasi Swakelola',
};

export function Topbar() {
  const pathname = usePathname();
  const { full_name, role } = useSession();
  const [spseSync, setSpseSync] = useState('');
  const [sirupSync, setSirupSync] = useState('');

  // Determine Title
  const title = TITLES[pathname] ?? 'Ringkasan Kementerian';

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
        return `tersinkron ${m}m ${String(s).padStart(2, '0')}d lalu`;
      };
      setSpseSync(fmt(spseStart));
      setSirupSync(fmt(sirupStart));
    };

    tick();
    const intv = setInterval(tick, 1000);
    return () => clearInterval(intv);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.titleWrap}>
        <span className={styles.eyebrow}>DEWA-PBJ</span>
        <h1>{title}</h1>
      </div>
      <div className={styles.controlsRow}>
        <div className={styles.syncRow}>
          <span className={styles.syncItem}>
            <span className={`${styles.dot} ${styles.ok}`} />
            <span className={styles.syncLabel}>SPSE</span>
            <span className={styles.mono}>{spseSync}</span>
          </span>
          <span className={styles.syncItem}>
            <span className={`${styles.dot} ${styles.warn}`} />
            <span className={styles.syncLabel}>SIRUP</span>
            <span className={styles.mono}>{sirupSync}</span>
          </span>
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
    </header>
  );
}
