import { Metadata } from 'next';
import { TenderView } from '@/features/tender/components/TenderView';

export const metadata: Metadata = {
  title: 'Realisasi Tender - Dewa-PBJ',
  description: 'Ringkasan Realisasi Tender',
};

export default function TenderPage() {
  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <TenderView />
    </div>
  );
}
