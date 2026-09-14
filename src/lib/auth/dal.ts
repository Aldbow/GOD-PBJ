import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess, LANDING } from '@/lib/auth/access';
import type { Profile, Role } from '@/types';

/**
 * Data Access Layer — pemeriksaan otorisasi sisi server (secure), dekat data.
 * `cache` memoize hasil dalam satu render pass agar tidak query berulang.
 */

/** Kembalikan user terautentikasi atau redirect ke /login. */
export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  return user;
});

/** Ambil profil (role, ppk_name, ...) user saat ini. Redirect bila tak ada. */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, ppk_name, eselon1, satker, is_active')
    .eq('id', user.id)
    .single();

  if (error || !data) redirect('/login');
  if (!data.is_active) redirect('/login');

  return data as Profile;
});

/** Pastikan user boleh mengakses `path`; jika tidak, redirect ke landing-nya. */
export async function requireAccess(path: string): Promise<Profile> {
  const profile = await getProfile();
  if (!canAccess(profile.role, path)) {
    redirect(LANDING[profile.role]);
  }
  return profile;
}

/** Pastikan role user termasuk salah satu `roles`; jika tidak, redirect. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!roles.includes(profile.role)) {
    redirect(LANDING[profile.role]);
  }
  return profile;
}

/**
 * Versi non-redirect untuk Route Handlers (API). Kembalikan Profile aktif atau
 * null bila tak ada session valid / akun nonaktif. Pemanggil memutuskan status
 * HTTP (401/403).
 */
export async function getApiProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, ppk_name, eselon1, satker, is_active')
    .eq('id', user.id)
    .single();

  if (!data || !data.is_active) return null;
  return data as Profile;
}
