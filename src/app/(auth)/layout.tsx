import React from 'react';

/**
 * Layout grup (auth) — tanpa Shell (sidebar/topbar). Halaman login berdiri sendiri.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
