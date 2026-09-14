import { Metadata } from 'next';
import { Suspense } from 'react';
import { NotifikasiView } from '@/features/notifikasi/components/NotifikasiView';

export const metadata: Metadata = {
  title: 'Notifikasi - Dewa-PBJ',
  description: 'Paket yang perlu perhatian PPK',
};

export default function NotifikasiPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat notifikasi...</p>}>
      <NotifikasiView />
    </Suspense>
  );
}
