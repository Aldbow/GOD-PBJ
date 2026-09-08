"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
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
  return (
    <div className={styles.appShell}>
      <Sidebar />
      <main className={styles.mainArea}>
        <Topbar lastDataUpdate={lastDataUpdate} />
        {children}
      </main>
      <ScrollToTop />
    </div>
  );
}
