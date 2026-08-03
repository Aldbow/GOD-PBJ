import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, Target, Briefcase, FileText, GraduationCap, ListChecks, Star, Database, ShieldAlert } from 'lucide-react';
import type { Role } from '@/types';
import { canAccess } from '@/lib/auth/access';

/**
 * `roles` = allowlist role eksplisit untuk entri yang TIDAK bisa dinilai oleh
 * `canAccess` — yaitu tautan eksternal (absolute URL), yang selalu lolos gate
 * berbasis prefix path. Tanpa `roles`, visibilitas murni ditentukan ROUTE_ACCESS.
 */
export type NavLink = { name: string; href: string; icon: React.ReactNode; roles?: Role[] };
export type NavGroup = { id: string; label: string | null; links: NavLink[]; roles?: Role[] };

/**
 * SATU sumber kebenaran struktur navigasi — dipakai oleh Sidebar (menu),
 * Topbar (breadcrumb otomatis), dan CommandPalette (pencarian cepat).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'ringkasan',
    label: null,
    links: [
      { name: 'Ringkasan', href: '/ringkasan', icon: React.createElement(LayoutDashboard, { size: 18 }) },
    ],
  },
  {
    id: 'perencanaan',
    label: 'Perencanaan',
    links: [
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
    id: 'risiko',
    label: 'Manajemen Risiko',
    links: [
      { name: 'Risiko Pengadaan', href: '/risiko-pengadaan', icon: React.createElement(ShieldAlert, { size: 18 }) },
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
  {
    id: 'prioritas-nasional',
    label: 'Program Prioritas Nasional',
    // Tautan eksternal (bukan rute aplikasi ini) → tidak tertangkap ROUTE_ACCESS.
    // Khusus admin/UKPBJ; disembunyikan dari PPK & Sekretariat Jenderal.
    roles: ['admin'],
    links: [
      { name: 'Prioritas Nasional', href: 'https://god-pbj.vercel.app/prioritas-nasional', icon: React.createElement(Star, { size: 18 }) },
      { name: 'Master Data PN', href: 'https://god-pbj.vercel.app/program-prioritas', icon: React.createElement(Database, { size: 18 }) },
    ],
  },
];

/**
 * Grup + link yang boleh dilihat `role`. SATU tempat penyaringan menu — dipakai
 * Sidebar dan CommandPalette supaya keduanya tidak pernah berbeda isi.
 */
export function navGroupsFor(role: Role): NavGroup[] {
  return NAV_GROUPS.filter((group) => !group.roles || group.roles.includes(role))
    .map((group) => ({
      ...group,
      links: group.links.filter(
        (link) => (!link.roles || link.roles.includes(role)) && canAccess(role, link.href)
      ),
    }))
    .filter((group) => group.links.length > 0);
}

/** Cari grup + link yang cocok dengan path aktif (untuk breadcrumb & auto-expand grup). */
export function findActiveEntry(pathname: string): { group: NavGroup; link: NavLink } | null {
  for (const group of NAV_GROUPS) {
    const link = group.links.find((l) => l.href === pathname);
    if (link) return { group, link };
  }
  return null;
}
