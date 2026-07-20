import { PenunjukanLangsungView } from '@/features/penunjukan-langsung/components/PenunjukanLangsungView';
import { PageTransition } from '@/components/layout/PageTransition';
import { Suspense } from 'react';

export const metadata = {
  title: 'Penunjukan Langsung | Dasbor PBJ',
  description: 'Realisasi paket dengan metode Penunjukan Langsung',
};

export default function PenunjukanLangsungPage() {
  return (
    <PageTransition>
      <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
        <PenunjukanLangsungView />
      </Suspense>
    </PageTransition>
  );
}
