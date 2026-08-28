import type { Metadata } from 'next';

import { AdminPanel } from '@features/admin/components/admin-panel';
import { adminOturumunuDogrula } from '@features/auth/dal';

export const metadata: Metadata = {
  title: 'Admin Paneli | EKAP Editör',
};

export default async function AdminPage() {
  await adminOturumunuDogrula();
  return <AdminPanel />;
}
