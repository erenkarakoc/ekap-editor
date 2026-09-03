import { AdminShell } from '@features/admin/components/admin-shell';
import { adminOturumunuDogrula } from '@features/auth/dal';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await adminOturumunuDogrula();
  return <AdminShell>{children}</AdminShell>;
}
