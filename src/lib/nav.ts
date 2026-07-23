import React from 'react';
import { LayoutDashboard, Users, ShoppingCart, Package, Target, Briefcase, FileText, GraduationCap, ListChecks } from 'lucide-react';

export type NavLink = { name: string; href: string; icon: React.ReactNode };
export type NavGroup = { id: string; label: string | null; links: NavLink[] };

/**
 * SATU sumber kebenaran struktur navigasi — dipakai oleh Sidebar (menu),
 * Topbar (breadcrumb otomatis), dan CommandPalette (pencarian cepat).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'ringkasan',
    label: null,
    links: [
      { name: 'Ringkasan', href: '/', icon: React.createElement(LayoutDashboard, { size: 18 }) },
    ],
  },
  {
    id: 'perencanaan',
    label: 'Perencanaan',
    links: [
      { name: 'Tampilan PPK', href: '/ppk', icon: React.createElement(Users, { size: 18 }) },
      { name: 'Rencana Umum Pengadaan', href: '/rencana-pengadaan', icon: React.createElement(FileText, { size: 18 }) },
    ],
  },
  {
    id: 'realisasi',
    label: 'Realisasi',
    links: [
      { name: 'Realisasi E-Purchasing V6', href: '/epurchasing', icon: React.createElement(ShoppingCart, { size: 18 }) },
      { name: 'Realisasi Tender', href: '/tender', icon: React.createElement(Briefcase, { size: 18 }) },
      { name: 'Realisasi Pengadaan Langsung', href: '/pengadaan-langsung', icon: React.createElement(Package, { size: 18 }) },
      { name: 'Realisasi Penunjukan Langsung', href: '/penunjukan-langsung', icon: React.createElement(Target, { size: 18 }) },
      { name: 'Realisasi Swakelola', href: '/swakelola', icon: React.createElement(Package, { size: 18 }) },
    ],
  },
  {
    id: 'itkp',
    label: 'ITKP',
    links: [
      { name: 'Dashboard Penilaian ITKP', href: '/itkp', icon: React.createElement(GraduationCap, { size: 18 }) },
      { name: 'ITKP Pemanfaatan Sistem', href: '/itkp/pemanfaatan-sistem', icon: React.createElement(ListChecks, { size: 18 }) },
    ],
  },
];

/** Cari grup + link yang cocok dengan path aktif (untuk breadcrumb & auto-expand grup). */
export function findActiveEntry(pathname: string): { group: NavGroup; link: NavLink } | null {
  for (const group of NAV_GROUPS) {
    const link = group.links.find((l) => l.href === pathname);
    if (link) return { group, link };
  }
  return null;
}
