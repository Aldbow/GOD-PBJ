"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
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
  return (
    <div className={styles.appShell}>
      <NavProgress />
      <Sidebar />
      <main className={styles.mainArea}>
        <Topbar lastDataUpdate={lastDataUpdate} />
        <PageTransition>{children}</PageTransition>
      </main>
      <ScrollToTop />
    </div>
  );
}
