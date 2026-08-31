"use client";

import React from 'react';
import styles from './Topbar.module.css';

import { ThemeToggle } from './ThemeToggle';
import { usePathname } from 'next/navigation';
import { Search, ChevronRight, LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { ROLE_LABEL } from '@/lib/auth/access';
import { logout } from '@/lib/auth/actions';
import { findActiveEntry } from '@/lib/nav';
import { PpkNotificationBell } from './PpkNotificationBell';

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const { full_name, role } = useSession();

  const activeEntry = findActiveEntry(pathname);
  const title = activeEntry?.link.name ?? 'Ringkasan Kementerian';
  const breadcrumbGroup = activeEntry?.group.label;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.titleWrap}>
        <div className={styles.inlineBreadcrumb}>
          <span className={styles.eyebrow}>DEWA-PBJ</span>
          {breadcrumbGroup && (
            <>
              <ChevronRight size={14} className={styles.crumbSep} />
              <span className={styles.crumbGroup}>{breadcrumbGroup}</span>
            </>
          )}
          <ChevronRight size={14} className={styles.crumbSep} />
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>
      </div>

      <div className={styles.controlsRow}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onOpenPalette}
          aria-label="Pencarian"
          title="Pencarian (Ctrl+K)"
        >
          <Search size={16} />
        </button>

        <PpkNotificationBell />
        <ThemeToggle />

        <div className={styles.divider} />

        <div className={styles.userSection}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>
              {full_name ? getInitials(full_name) : 'U'}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{full_name}</span>
              <span className={styles.userRole}>{ROLE_LABEL[role]}</span>
            </div>
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
