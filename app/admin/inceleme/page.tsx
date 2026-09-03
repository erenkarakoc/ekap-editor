import { ReviewView } from '@features/admin/components/review-view';
import { incelemeleriGetir } from '@features/admin/lib/admin-data';

export default async function IncelemePage() {
  return <ReviewView kayitlar={await incelemeleriGetir()} />;
}
