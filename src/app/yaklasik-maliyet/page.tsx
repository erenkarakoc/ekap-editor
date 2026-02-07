import { redirect } from 'next/navigation';
import { Calculator } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/header';

export default async function YaklasikMaliyetPage() {
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

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="bg-muted text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl">
            <Calculator className="size-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Yaklaşık Maliyet</h1>
          <p className="text-muted-foreground">Yakında</p>
        </div>
      </main>
    </div>
  );
}
