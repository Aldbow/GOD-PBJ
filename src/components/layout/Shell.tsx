"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './Shell.module.css';

import { ScrollToTop } from '@/components/ui/ScrollToTop';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.appShell}>
      <Sidebar />
      <main className={styles.mainArea}>
        <Topbar />
        {children}
      </main>
      <ScrollToTop />
    </div>
  );
}
