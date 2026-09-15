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
import { PpkNotificationBell } from './PpkNotificationBell';
import { DataFreshness } from './DataFreshness';
import { LastUpdatePill } from './LastUpdatePill';

/** Di bawah ini topbar boleh sembunyi; di atasnya (dekat puncak halaman) ia
 * selalu tampil -- tidak ada untungnya menyembunyikan chrome navigasi tepat
 * saat pengguna baru mendarat di halaman. */
const HIDE_THRESHOLD = 60;
/** Diam sekian lama setelah scroll (arah mana pun) -> topbar mundur sendiri,
 * bukan hanya saat scroll ke bawah. Meniru pola auto-hide umum (YouTube,
 * Medium): scroll ke atas memunculkannya lagi, tapi ia tidak menetap selamanya
 * kalau pengguna berhenti membaca di situ. */
const IDLE_HIDE_MS = 2500;

/**
 * `lastDataUpdate` diteruskan dari server (AppLayout -> Shell -> sini), bukan
 * di-fetch di client: nilainya sudah tersedia saat layout dirender, jadi tidak
 * perlu request tambahan dan tidak ada kedipan kosong setelah mount.
 *
 * `onOpenPalette` dimiliki Shell (dibagi dengan CommandRail), bukan state lokal
 * di sini -- lihat komentar di Shell.tsx.
 */
export function Topbar({
  lastDataUpdate,
  onOpenPalette,
}: {
  lastDataUpdate: string | null;
  onOpenPalette: () => void;
}) {
  const pathname = usePathname();
  const { full_name, role } = useSession();
  const [isHidden, setIsHidden] = useState(false);

  const activeEntry = findActiveEntry(pathname);
  const title = activeEntry?.link.name ?? 'Ringkasan Kementerian';
  const breadcrumbGroup = activeEntry?.group.label;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Turun (dan sudah lewat ambang) -> sembunyi. Selain itu (termasuk naik
      // sedikit pun, atau balik dekat puncak) -> tampil.
      if (currentScrollY > lastScrollY && currentScrollY > HIDE_THRESHOLD) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
      lastScrollY = currentScrollY;

      // Setiap ada gerak scroll, tunda dulu jam idle-nya. Kalau posisinya
      // masih jauh dari puncak dan pengguna berhenti scroll, jam ini yang
      // akhirnya menyembunyikan topbar -- meski scroll terakhirnya ke atas.
      clearTimeout(idleTimer);
      if (currentScrollY > HIDE_THRESHOLD) {
        idleTimer = setTimeout(() => setIsHidden(true), IDLE_HIDE_MS);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(idleTimer);
    };
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
        <DataFreshness finishedAt={lastDataUpdate} />
        <LastUpdatePill finishedAt={lastDataUpdate} />

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
