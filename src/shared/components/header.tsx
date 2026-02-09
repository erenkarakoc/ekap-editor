'use client';

import Link from 'next/link';
import { LogOut, UserIcon, Upload, Save, Loader2 } from 'lucide-react';

import { Button } from '@shared/components/ui/button';
import { Kbd } from '@shared/components/ui/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { ModeToggle } from '@shared/components/mode-toggle';
import { useAuth } from '@features/auth/context';

interface HeaderProps {
  children?: React.ReactNode;
  title?: string | null;
  variant?: 'default' | 'editor';
  // Editor-specific props
  onUpload?: () => void;
  onSave?: () => void;
  canSave?: boolean;
  isSaving?: boolean;
}

export function Header({
  children,
  title,
  variant = 'default',
  onUpload,
  onSave,
  canSave = false,
  isSaving = false,
}: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-background/95 z-20 flex h-12 shrink-0 items-center justify-between overflow-hidden border-b px-2 backdrop-blur">
      {/* Left side */}
      <div className="flex h-full items-center overflow-hidden">
        {title && (
          <Link
            href="/"
            className="text-foreground flex h-8 shrink-0 items-center px-2 text-sm font-semibold"
          >
            {title}
          </Link>
        )}

        {children}
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-2">
        {variant === 'editor' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onUpload}
              className="hidden h-8 cursor-pointer gap-2 sm:inline-flex"
            >
              <Upload className="size-4" />
              <Kbd className="hidden sm:inline-flex">Ctrl O</Kbd>
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!canSave || isSaving}
              onClick={onSave}
              className="h-8 cursor-pointer gap-2"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span className="hidden sm:inline">Kaydet</span>
            </Button>
          </>
        )}
        <ModeToggle />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" className="size-8 cursor-pointer">
                <UserIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/user" className="cursor-pointer">
                  <UserIcon className="mr-2 size-4" />
                  Profilim
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => signOut()}>
                <LogOut className="mr-2 size-4" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Giriş Yap</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Kayıt Ol</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
