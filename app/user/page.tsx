import { UserSettingsForm } from '@features/user/components/user-settings-form';
import { Header } from '@shared/components/header';

export default function UserPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 justify-center p-4 md:p-8">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Hesap Ayarları</h1>
            <p className="text-muted-foreground text-sm">
              Hesap bilgilerinizi ve tercihlerinizi yönetin.
            </p>
          </div>
          <UserSettingsForm />
        </div>
      </main>
    </div>
  );
}
