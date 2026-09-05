import type { Metadata } from 'next';

import { UyelikPaneli } from '@features/membership/components/membership-panel';
import { oturumuDogrula } from '@features/auth/dal';

export const metadata: Metadata = {
  title: 'Üyelik | İcmal',
};

export default async function UyelikPage() {
  await oturumuDogrula();
  return <UyelikPaneli />;
}
