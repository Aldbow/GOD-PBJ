import { RencanaPengadaanView } from '@/features/rencana-pengadaan/components/RencanaPengadaanView';
import { Suspense } from 'react';

export default function RencanaPengadaanPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
      <RencanaPengadaanView />
    </Suspense>
  );
}
