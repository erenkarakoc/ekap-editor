import { RegisterForm } from '@features/auth/components/register-form';
import { BrandLogo } from '@shared/components/brand-logo';

export default function RegisterPage() {
  return (
    <div className="bg-background flex min-h-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mb-5 flex justify-center" role="img" aria-label="İcmal">
            <BrandLogo className="h-10" />
          </div>
          <h1 className="display-heading text-2xl">Kayıt Ol</h1>
          <p className="text-muted-foreground mt-2 text-sm">İcmal hesabı oluşturun</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
