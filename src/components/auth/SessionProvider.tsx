"use client";

import React, { createContext, useContext } from 'react';
import type { Profile } from '@/types';

/**
 * Menyediakan profil user (role, ppk_name, ...) ke komponen client.
 * Di-seed dari server (getProfile) di layout grup (app).
 */
const SessionContext = createContext<Profile | null>(null);

export function SessionProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={profile}>{children}</SessionContext.Provider>;
}

export function useSession(): Profile {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession harus dipakai di dalam <SessionProvider>');
  }
  return ctx;
}
