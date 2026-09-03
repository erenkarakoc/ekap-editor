import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Admin Paneli | EKAP Editör',
};

export default function AdminPage() {
  redirect('/admin/genel');
}
