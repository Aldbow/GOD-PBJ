import { SwakelolaView } from '@/features/swakelola/components/SwakelolaView';
import { Suspense } from 'react';

export const metadata = {
  title: 'Realisasi Swakelola - Dewa-PBJ',
  description: 'Ringkasan Realisasi Swakelola',
};

export default function SwakelolaPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
      <SwakelolaView />
    </Suspense>
  );
}
