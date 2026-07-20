"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { LayoutDashboard, Users, Component, ShoppingCart, Package, Target, Briefcase, FileText } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { canAccess } from '@/lib/auth/access';

type NavLink = { name: string; href: string; icon: React.ReactNode };
type NavGroup = { label: string | null; links: NavLink[] };

const groups: NavGroup[] = [
  {
    label: null,
    links: [
      { name: 'Ringkasan', href: '/', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    label: 'Perencanaan',
    links: [
      { name: 'Tampilan PPK', href: '/ppk', icon: <Users size={18} /> },
      { name: 'Drill-down satker', href: '/drilldown', icon: <Component size={18} /> },
      { name: 'Rencana Umum Pengadaan', href: '/rencana-pengadaan', icon: <FileText size={18} /> },
    ],
  },
  {
    label: 'Realisasi',
    links: [
      { name: 'Realisasi E-Purchasing V6', href: '/epurchasing', icon: <ShoppingCart size={18} /> },
      { name: 'Realisasi Tender', href: '/tender', icon: <Briefcase size={18} /> },
      { name: 'Realisasi Pengadaan Langsung', href: '/pengadaan-langsung', icon: <Package size={18} /> },
      { name: 'Realisasi Penunjukan Langsung', href: '/penunjukan-langsung', icon: <Target size={18} /> },
      { name: 'Realisasi Swakelola', href: '/swakelola', icon: <Package size={18} /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useSession();

  // Filter menu sesuai hak akses role; buang grup yang jadi kosong.
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => canAccess(role, link.href)),
    }))
    .filter((group) => group.links.length > 0);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark} />
        <div className={styles.brandText}>
          <strong>DEWA-PBJ</strong>
          <span>Early warning pengadaan</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {visibleGroups.map((group, gi) => (
          <div key={gi} className={styles.group}>
            {group.label && <p className={styles.groupLabel}>{group.label}</p>}
            {group.links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navBtn} ${isActive ? styles.active : ''}`}
                >
                  <span className={styles.navIcon}>{link.icon}</span>
                  <span className={styles.navLabel}>{link.name}</span>
                  {isActive && <span className={styles.activeIndicator} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.sidebarFoot}>
        <span className={styles.footVersion}>Prototipe v0.1</span>
        Aksi perubahan — Kemnaker
        <br />
        Data ilustratif, 22 Jun 2026
      </div>
    </aside>
  );
}
