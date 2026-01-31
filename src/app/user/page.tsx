import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { UserSettingsForm } from '@/components/user/user-settings-form';
import { Header } from '@/components/header';

export default async function UserPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header user={user} />

      <main className="flex flex-1 justify-center p-4 md:p-8">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Hesap Ayarları</h1>
            <p className="text-muted-foreground text-sm">
              Hesap bilgilerinizi ve tercihlerinizi yönetin.
            </p>
          </div>
          <UserSettingsForm user={user} />
        </div>
      </main>
    </div>
  );
}
