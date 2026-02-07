'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { useAuth } from '@features/auth/context';
import type { AccountType, UserMetadata } from '@features/user/types';

export function UserSettingsForm() {
  const { user, updateUser } = useAuth();
  const metadata = (user?.user_metadata || {}) as UserMetadata;

  const [accountType, setAccountType] = useState<AccountType>(metadata.account_type || 'personal');
  const [firstName, setFirstName] = useState(metadata.first_name || '');
  const [lastName, setLastName] = useState(metadata.last_name || '');
  const [companyName, setCompanyName] = useState(metadata.company_name || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const result = await updateUser({
        data: {
          account_type: accountType,
          first_name: accountType === 'personal' ? firstName : null,
          last_name: accountType === 'personal' ? lastName : null,
          company_name: accountType === 'company' ? companyName : null,
        },
      });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      setMessage({ type: 'success', text: 'Profil güncellendi.' });
    } catch {
      setMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Şifre en az 6 karakter olmalıdır.' });
      return;
    }

    setIsPasswordLoading(true);

    try {
      const result = await updateUser({
        password: newPassword,
      });

      if (result.error) {
        setPasswordMessage({ type: 'error', text: result.error });
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({ type: 'success', text: 'Şifre güncellendi.' });
    } catch {
      setPasswordMessage({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Profil Bilgileri</h2>
          <p className="text-muted-foreground text-sm">
            Hesap türünüzü ve bilgilerinizi güncelleyin.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Hesap Türü</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={accountType === 'personal' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAccountType('personal')}
              >
                Bireysel
              </Button>
              <Button
                type="button"
                variant={accountType === 'company' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAccountType('company')}
              >
                Kurumsal
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-muted-foreground text-xs">E-posta adresi değiştirilemez.</p>
          </div>

          {accountType === 'personal' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Adınız"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Soyadınız"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="companyName">Şirket Adı</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Şirket adınız"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {message && (
          <div
            className={`rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {message.text}
          </div>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Kaydet
        </Button>
      </form>

      <hr />

      {/* Password Section */}
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Şifre Değiştir</h2>
          <p className="text-muted-foreground text-sm">Hesap şifrenizi güncelleyin.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Yeni Şifre</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isPasswordLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Yeni Şifre Tekrar</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isPasswordLoading}
            />
          </div>
        </div>

        {passwordMessage && (
          <div
            className={`rounded-md p-3 text-sm ${
              passwordMessage.type === 'success'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {passwordMessage.text}
          </div>
        )}

        <Button type="submit" disabled={isPasswordLoading || !newPassword || !confirmPassword}>
          {isPasswordLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Şifreyi Güncelle
        </Button>
      </form>
    </div>
  );
}
