import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from '@/components/auth/register-form';
import { Header } from '@/components/header';

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/editor');
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Kayıt Ol</h1>
            <p className="text-muted-foreground mt-2 text-sm">EKAP Editör hesabı oluşturun</p>
          </div>
          <RegisterForm />
        </div>
      </main>
    </div>
  );
}
