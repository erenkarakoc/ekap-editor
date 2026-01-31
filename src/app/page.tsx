import Link from 'next/link';
import { FileText } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header user={user} />

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="bg-primary text-primary-foreground mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl">
            <FileText className="size-10" />
          </div>
          <h1 className="mb-4 text-4xl font-bold">EKAP Editör</h1>
          <p className="text-muted-foreground mb-8">
            EKAP dosyalarınızı kolayca görüntüleyin ve düzenleyin.
          </p>
          {!user && (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/register">Kayıt Ol</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Giriş Yap</Link>
              </Button>
            </div>
          )}
          {user && (
            <Button size="lg" asChild>
              <Link href="/editor">Editöre Git</Link>
            </Button>
          )}
        </div>
      </main>

      <footer className="border-t py-4 text-center">
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} EKAP Editör
        </p>
      </footer>
    </div>
  );
}
