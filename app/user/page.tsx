'use client';

import { UserSettingsForm } from '@features/user/components/user-settings-form';

export default function UserPage() {
  return (
    <div className="flex-1 overflow-auto p-4 md:p-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Hesap Ayarları</h1>
          <p className="text-muted-foreground text-sm">
            Hesap bilgilerinizi ve tercihlerinizi yönetin.
          </p>
        </div>
        <UserSettingsForm />
      </div>
    </div>
  );
}
