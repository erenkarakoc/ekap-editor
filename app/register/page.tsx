import { RegisterForm } from '@features/auth/components/register-form';

export default function RegisterPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Kayıt Ol</h1>
          <p className="text-muted-foreground mt-2 text-sm">EKAP Editör hesabı oluşturun</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
