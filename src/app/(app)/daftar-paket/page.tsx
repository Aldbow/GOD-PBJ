import { DaftarPaketView } from '@/features/daftar-paket/components/DaftarPaketView';
import { Suspense } from 'react';

export const metadata = {
  title: 'Daftar Seluruh Paket - Dewa-PBJ',
  description: 'Seluruh paket pengadaan lintas metode dan jenis',
};

export default function DaftarPaketPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
      <DaftarPaketView />
    </Suspense>
  );
}
