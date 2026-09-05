import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Admin Paneli | İcmal',
};

export default function AdminPage() {
  redirect('/admin/genel');
}
