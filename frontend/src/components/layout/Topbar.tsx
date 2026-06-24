"use client";

import React, { useEffect, useState } from 'react';
import styles from './Topbar.module.css';
import { Select } from '@/components/ui/Select';
import { ThemeToggle } from './ThemeToggle';
import { usePathname } from 'next/navigation';

export function Topbar() {
  const pathname = usePathname();
  const [spseSync, setSpseSync] = useState('');
  const [sirupSync, setSirupSync] = useState('');

  // Determine Title
  let title = 'Ringkasan Kementerian';
  if (pathname === '/ppk') title = 'Tampilan PPK';
  if (pathname === '/drilldown') title = 'Drill-down Satuan Kerja';

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
      <h1>{title}</h1>
      <div className={styles.controlsRow}>
        <div className={styles.syncRow}>
          <span className={styles.syncItem}>
            <span className={`${styles.dot} ${styles.ok}`} />
            SPSE · <span className={styles.mono}>{spseSync}</span>
          </span>
          <span className={styles.syncItem}>
            <span className={`${styles.dot} ${styles.warn}`} />
            SIRUP · <span className={styles.mono}>{sirupSync}</span>
          </span>
        </div>

        <Select
          options={[
            { value: 'sekjen', label: 'Sekretaris Jenderal' },
            { value: 'kabiro', label: 'Kepala Biro Umum / UKPBJ' },
            { value: 'kasatker', label: 'Kepala Satuan Kerja' },
            { value: 'ppk', label: 'PPK' }
          ]}
          onChange={(e) => {
            // Usually this would set global state or change route
            if(e.target.value === 'ppk') {
              window.location.href = '/ppk';
            } else {
              window.location.href = '/';
            }
          }}
        />

        <ThemeToggle />
      </div>
    </header>
  );
}
