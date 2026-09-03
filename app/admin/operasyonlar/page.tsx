import { OperationsView } from '@features/admin/components/operations-view';
import { gorevleriGetir } from '@features/admin/lib/admin-data';

export default async function OperasyonlarPage() {
  return <OperationsView gorevler={await gorevleriGetir()} />;
}
