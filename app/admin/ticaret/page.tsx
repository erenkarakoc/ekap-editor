import { CommerceView } from '@features/admin/components/commerce-view';
import { ticaretVerisiniGetir } from '@features/admin/lib/admin-data';

export default async function TicaretPage() {
  return <CommerceView veri={await ticaretVerisiniGetir()} />;
}
