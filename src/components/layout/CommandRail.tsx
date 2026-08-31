"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { navGroupsFor, type NavGroup } from '@/lib/nav';
import { useSession } from '@/components/auth/SessionProvider';
import styles from './CommandRail.module.css';

/**
 * Rail melayang: enam GRUP di rail, tautan grup itu di flyout. Yang dibatasi
 * bukan jumlah halaman melainkan jumlah tujuan tingkat satu — menambah entri ke
 * NAV_GROUPS tidak pernah mengubah lebar rail.
 *
 * Kunci harus cocok dengan NavGroup.id; grup baru yang belum terdaftar jatuh ke
 * Layers, bukan render kosong.
 */
const GROUP_ICON: Record<string, React.ElementType> = {
  ringkasan: LayoutDashboard,
  perencanaan: FileText,
  realisasi: Layers,
  risiko: ShieldAlert,
  itkp: GraduationCap,
  'prioritas-nasional': Star,
};

/** Kursor perlu waktu menyeberang celah rail → flyout; tutup instan bikin frustrasi. */
const CLOSE_DELAY = 180;

/**
 * Flyout diposisikan sejajar tombol yang membukanya, jadi tingginya harus
 * diketahui SEBELUM render untuk di-clamp ke dalam viewport. Dihitung dari
 * jumlah tautan, bukan diukur — pengukuran baru tersedia setelah cat pertama,
 * dan itu satu frame terlambat.
 */
const FLYOUT_PAD = 10;
const FLYOUT_TITLE_H = 28;
const FLYOUT_ITEM_H = 38;
const RAIL_BTN_H = 44;

function flyoutHeight(group: NavGroup): number {
  const title = group.links.length > 1 ? FLYOUT_TITLE_H : 0;
  return FLYOUT_PAD * 2 + title + group.links.length * FLYOUT_ITEM_H;
}

/**
 * Panel disejajarkan supaya BARIS PERTAMANYA persis di tinggi ikon yang
 * membukanya — bukan tepi atas panel yang disejajarkan dengan tepi tombol.
 * Jejak mata dari ikon ke tautan pertama jadi horizontal, tanpa lompatan.
 */
function flyoutOffset(group: NavGroup): number {
  const title = group.links.length > 1 ? FLYOUT_TITLE_H : 0;
  return RAIL_BTN_H / 2 - (FLYOUT_PAD + title + FLYOUT_ITEM_H / 2);
}

/**
 * `at` = rute tempat flyout ini dibuka. Menyimpannya membuat "tutup saat pindah
 * halaman" jadi turunan dari pathname, bukan efek yang memanggil setState —
 * state yang lahir di rute lain sudah basi dengan sendirinya.
 */
type OpenState = { id: string; anchorTop: number; at: string; pinned: boolean };

export function CommandRail({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const { role } = useSession();
  const groups = navGroupsFor(role);

  const [open, setOpen] = useState<OpenState | null>(null);

  const dockRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLElement | null)[]>([]);
  const closeTimer = useRef<number | undefined>(undefined);

  const live = open && open.at === pathname ? open : null;
  const shown = live ? (groups.find((g) => g.id === live.id) ?? null) : null;
  const activeId = groups.find((g) => g.links.some((l) => l.href === pathname))?.id ?? null;

  const reveal = useCallback(
    (id: string, el: HTMLElement | null, pin = false) => {
      window.clearTimeout(closeTimer.current);
      const anchorTop = el?.getBoundingClientRect().top ?? 0;
      setOpen((prev) => ({
        id,
        anchorTop,
        at: pathname,
        pinned: pin || (prev?.id === id && prev.at === pathname && prev.pinned),
      }));
    },
    [pathname]
  );

  const dismiss = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setOpen(null);
  }, []);

  /** Yang di-pin bertahan; yang cuma dihampiri kursor menutup sendiri. */
  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(
      () => setOpen((prev) => (prev?.pinned ? prev : null)),
      CLOSE_DELAY
    );
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    const onPointer = (e: PointerEvent) => {
      if (!dockRef.current?.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    // Posisi flyout dikunci ke tombol saat dibuka; resize membuat angka itu bohong.
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', dismiss);
    };
  }, [live, dismiss]);

  /** Rail bertindak sebagai satu widget: Tab keluar-masuk sekali, panah untuk isinya. */
  const onRailKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      btnRefs.current[(index + step + groups.length) % groups.length]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      flyoutRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    }
  };

  const flyoutTop =
    shown && live
      ? Math.min(
          Math.max(12, live.anchorTop + flyoutOffset(shown)),
          (typeof window === 'undefined' ? 900 : window.innerHeight) - flyoutHeight(shown) - 12
        )
      : 0;

  return (
    <div ref={dockRef} className={styles.dock}>
      <nav className={styles.rail} aria-label="Navigasi utama" onMouseLeave={scheduleClose}>
        <button
          type="button"
          className={styles.cmdBtn}
          onClick={onOpenPalette}
          onMouseEnter={scheduleClose}
          aria-label="Cari halaman (Ctrl+K)"
        >
          <Command size={18} />
          <span className={styles.tip}>Cari · Ctrl K</span>
        </button>

        <span className={styles.rule} aria-hidden="true" />

        {groups.map((group, i) => {
          const Icon = GROUP_ICON[group.id] ?? Layers;
          const isActive = group.id === activeId;
          const isOpen = live?.id === group.id;
          const solo = group.links.length === 1 ? group.links[0] : null;
          const label = group.label ?? group.links[0].name;

          const inner = (
            <>
              {isActive && (
                <motion.span
                  layoutId="railActive"
                  className={styles.activePill}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={19} className={styles.railIcon} />
            </>
          );

          // Tiga dari enam grup hanya punya satu halaman. Memaksa flyout dua
          // langkah untuk tujuan tunggal adalah klik yang tidak membeli apa pun;
          // grup itu menavigasi langsung, dan hover tetap menyingkap namanya.
          if (solo) {
            return (
              <Link
                key={group.id}
                href={solo.href}
                ref={(el) => {
                  btnRefs.current[i] = el;
                }}
                className={styles.railBtn}
                data-active={isActive || undefined}
                aria-label={label}
                aria-current={pathname === solo.href ? 'page' : undefined}
                onMouseEnter={(e) => reveal(group.id, e.currentTarget)}
                onFocus={(e) => reveal(group.id, e.currentTarget)}
                onKeyDown={(e) => onRailKey(e, i)}
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={group.id}
              type="button"
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              className={styles.railBtn}
              data-active={isActive || undefined}
              aria-label={label}
              aria-haspopup="true"
              aria-expanded={isOpen}
              aria-controls={isOpen ? 'rail-flyout' : undefined}
              onMouseEnter={(e) => reveal(group.id, e.currentTarget)}
              onFocus={(e) => reveal(group.id, e.currentTarget)}
              onKeyDown={(e) => onRailKey(e, i)}
              onClick={(e) => {
                if (isOpen && live?.pinned) dismiss();
                else reveal(group.id, e.currentTarget, true);
              }}
            >
              {inner}
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {shown && (
          <motion.div
            ref={flyoutRef}
            id="rail-flyout"
            role="group"
            aria-label={shown.label ?? 'Beranda'}
            className={styles.flyout}
            data-compact={shown.links.length === 1 || undefined}
            style={{ '--flyout-top': flyoutTop + 'px' } as React.CSSProperties}
            initial={{ opacity: 0, x: -10, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => window.clearTimeout(closeTimer.current)}
            onMouseLeave={scheduleClose}
          >
            {shown.links.length > 1 && (
              <p className={styles.flyoutTitle}>{shown.label ?? 'Beranda'}</p>
            )}
            {shown.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.item}
                data-current={pathname === link.href || undefined}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  {link.icon}
                </span>
                <span className={styles.itemLabel}>{link.short ?? link.name}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
