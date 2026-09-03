import { AgentsView } from '@features/admin/components/agents-view';
import { ajanlariGetir, workerlariGetir } from '@features/admin/lib/admin-data';

export default async function AjanlarPage() {
  const [ajanlar, workerlar] = await Promise.all([ajanlariGetir(), workerlariGetir()]);
  return <AgentsView ajanlar={ajanlar} workerlar={workerlar} />;
}
