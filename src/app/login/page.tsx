import { LoginForm } from '@/components/auth/login-form';
import { Header } from '@/components/header';

export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Giriş Yap</h1>
            <p className="text-muted-foreground mt-2 text-sm">EKAP Editör hesabınıza giriş yapın</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
