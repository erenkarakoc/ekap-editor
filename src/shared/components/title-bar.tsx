'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, UserIcon, Moon, Sun, Minus, Square, X, Copy } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { useAuth } from '@features/auth/context';

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      windowIsMaximized: () => Promise<boolean>;
      onMaximizeChange: (callback: (maximized: boolean) => void) => () => void;
    };
  }
}

interface TitleBarProps {
  title: string;
}

export function TitleBar({ title }: TitleBarProps) {
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.windowIsMaximized().then(setIsMaximized);
    const cleanup = window.electronAPI.onMaximizeChange(setIsMaximized);
    return cleanup;
  }, []);

  return (
    <div
      className="bg-background/95 flex h-8 shrink-0 items-center justify-between border-b px-3 backdrop-blur"
      style={isElectron ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
    >
      {/* Left: Current tool name */}
      <span className="text-foreground text-sm font-semibold">{title}</span>

      {/* Right: Theme + User + Window Controls */}
      <div
        className="flex items-center gap-1"
        style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-6 cursor-pointer"
          onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="size-3.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-3.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Tema değiştir</span>
        </Button>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6 cursor-pointer">
                <UserIcon className="size-3.5" />
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
              <Link href="/login">Giriş Yap</Link>
            </Button>
            <Button size="sm" className="h-6 px-2 text-xs" asChild>
              <Link href="/register">Kayıt Ol</Link>
            </Button>
          </div>
        )}

        {/* Window Controls (Electron only) */}
        {isElectron && (
          <>
            <div className="bg-border mx-1 h-4 w-px" />
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted size-6 cursor-pointer rounded-none"
              onClick={() => window.electronAPI?.windowMinimize()}
            >
              <Minus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted size-6 cursor-pointer rounded-none"
              onClick={() => window.electronAPI?.windowMaximize()}
            >
              {isMaximized ? <Copy className="size-3" /> : <Square className="size-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 cursor-pointer rounded-none hover:bg-red-500/90 hover:text-white"
              onClick={() => window.electronAPI?.windowClose()}
            >
              <X className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
