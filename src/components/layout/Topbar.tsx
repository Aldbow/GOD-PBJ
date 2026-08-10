"use client";

import React, { useEffect, useState } from 'react';
import styles from './Topbar.module.css';

import { ThemeToggle } from './ThemeToggle';
import { usePathname } from 'next/navigation';
import { Search, ChevronRight, LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { ROLE_LABEL } from '@/lib/auth/access';
import { logout } from '@/lib/auth/actions';
import { findActiveEntry } from '@/lib/nav';
import { CommandPalette } from './CommandPalette';
import { PpkNotificationBell } from './PpkNotificationBell';

export function Topbar() {
  const pathname = usePathname();
  const { full_name, role } = useSession();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const activeEntry = findActiveEntry(pathname);
  const title = activeEntry?.link.name ?? 'Ringkasan Kementerian';
  const breadcrumbGroup = activeEntry?.group.label;
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

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

  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide topbar when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`${styles.topbar} ${isHidden ? styles.hidden : ''}`}>
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
          onClick={() => setPaletteOpen(true)}
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

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
