import { Metadata } from 'next';
import { Suspense } from 'react';
import { NotifikasiView } from '@/features/notifikasi/components/NotifikasiView';
import { PageTransition } from '@/components/layout/PageTransition';

export const metadata: Metadata = {
  title: 'Notifikasi - Dewa-PBJ',
  description: 'Paket yang perlu perhatian PPK',
};

export default function NotifikasiPage() {
  return (
    <PageTransition>
      <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat notifikasi...</p>}>
        <NotifikasiView />
      </Suspense>
    </PageTransition>
  );
}
