import { RingkasanView } from '@/features/ringkasan/components/RingkasanView';
import { PageTransition } from '@/components/layout/PageTransition';

export default function Home() {
  return (
    <PageTransition>
      <RingkasanView />
    </PageTransition>
  );
}
