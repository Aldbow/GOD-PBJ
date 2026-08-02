import type { Role } from '@/types';

/**
 * Peta akses RBAC — SATU sumber kebenaran.
 * Dipakai oleh proxy.ts (gate optimistik), DAL/page guard, Sidebar, dan API.
 *
 *   admin   → '*'  akses semua route
 *   sekjend → hanya Ringkasan '/ringkasan'
 *   ppk     → fitur Realisasi & Perencanaan, data ter-scope ke PPK ybs
 *
 * Nilai adalah prefix path yang diizinkan (match persis atau sub-path).
 */
export const ROUTE_ACCESS: Record<Role, string[] | '*'> = {
  admin: '*',
  sekjend: ['/ringkasan', '/rencana-pengadaan', '/itkp', '/risiko-pengadaan'],
  // PPK: fitur Perencanaan & Realisasi, data ter-scope ke PPK ybs.
  ppk: [
    '/epurchasing',
    '/tender',
    '/pengadaan-langsung',
    '/penunjukan-langsung',
    '/swakelola',
    '/rencana-pengadaan',
    '/risiko-pengadaan',
  ],
};

/** Route tujuan setelah login, per role. */
export const LANDING: Record<Role, string> = {
  admin: '/ringkasan',
  sekjend: '/ringkasan',
  // Halaman '/ppk' dihapus; PPK mendarat di Rencana Umum Pengadaan,
  // entri pertama yang masih ada di allowlist-nya.
  ppk: '/rencana-pengadaan',
};

/** Label ramah untuk role (UI). */
export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator (UKPBJ)',
  sekjend: 'Sekretariat Jenderal',
  ppk: 'PPK',
};

/** Halaman publik yang tidak butuh sesi — '/' adalah landing page marketing. */
export const PUBLIC_ROUTES = ['/', '/login'];

/**
 * Apakah `role` boleh mengakses `path`?
 * '/' hanya cocok persis; entri lain cocok bila path == entri atau diawali `entri + '/'`.
 */
export function canAccess(role: Role, path: string): boolean {
  if (path.startsWith('http://') || path.startsWith('https://')) return true;
  
  const allow = ROUTE_ACCESS[role];
  if (allow === '*') return true;
  return allow.some((base) =>
    base === '/' ? path === '/' : path === base || path.startsWith(base + '/')
  );
}
