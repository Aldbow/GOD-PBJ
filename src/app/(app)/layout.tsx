import { getProfile } from '@/lib/auth/dal';
import { Shell } from '@/components/layout/Shell';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { getLastDataUpdate } from '@/lib/data-update/lastUpdate';

/**
 * Layout untuk semua rute ter-proteksi (grup (app)).
 * Guard: getProfile() akan redirect ke /login bila tidak ada session valid.
 * Profil disebar ke client via SessionProvider (dipakai Sidebar/Topbar untuk gating UI).
 * Stempel update data diambil di sini juga supaya Topbar tidak perlu fetch sendiri;
 * layout ini memang selalu dinamis (getProfile membaca cookie), jadi nilainya
 * selalu segar tiap request.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, lastUpdate] = await Promise.all([getProfile(), getLastDataUpdate()]);

  return (
    <SessionProvider profile={profile}>
      <Shell lastDataUpdate={lastUpdate?.finishedAt ?? null}>{children}</Shell>
    </SessionProvider>
  );
}
