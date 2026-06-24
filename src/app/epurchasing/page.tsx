import { EPurchasingView } from '@/features/epurchasing/components/EPurchasingView';
import { PageTransition } from '@/components/layout/PageTransition';

export default function EPurchasingPage() {
  return (
    <PageTransition>
      <EPurchasingView />
    </PageTransition>
  );
}
