import { getProfile } from '@/lib/auth/dal';
import { Shell } from '@/components/layout/Shell';
import { SessionProvider } from '@/components/auth/SessionProvider';

/**
 * Layout untuk semua rute ter-proteksi (grup (app)).
 * Guard: getProfile() akan redirect ke /login bila tidak ada session valid.
 * Profil disebar ke client via SessionProvider (dipakai Sidebar/Topbar untuk gating UI).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <SessionProvider profile={profile}>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
