import type { Metadata } from 'next';

import { OverviewView } from '@features/admin/components/overview-view';
import { workerlariGetir, yonetimOzetiniGetir } from '@features/admin/lib/admin-data';

export const metadata: Metadata = { title: 'Genel Bakış | Kamu Poz Yönetimi' };

export default async function AdminGenelPage() {
  const [ozet, workerlar] = await Promise.all([yonetimOzetiniGetir(), workerlariGetir()]);
  return <OverviewView ozet={ozet} workerlar={workerlar} />;
}
