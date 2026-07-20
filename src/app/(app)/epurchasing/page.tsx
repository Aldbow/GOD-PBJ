import { EPurchasingView } from '@/features/epurchasing/components/EPurchasingView';
import { PageTransition } from '@/components/layout/PageTransition';
import { Suspense } from 'react';

export const metadata = {
  title: 'Realisasi E-Purchasing - Dewa-PBJ',
  description: 'Ringkasan Realisasi E-Purchasing',
};

export default function EPurchasingPage() {
  return (
    <PageTransition>
      <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
        <EPurchasingView />
      </Suspense>
    </PageTransition>
  );
}
