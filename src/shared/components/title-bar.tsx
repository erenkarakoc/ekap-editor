'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, LogOut, UserIcon, Moon, Sun, Minus, X } from 'lucide-react';
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
      onUpdateAvailable: (callback: () => void) => () => void;
      onUpdateDownloaded: (callback: () => void) => () => void;
      installUpdate: () => Promise<void>;
    };
  }
}

interface TitleBarProps {
  title: string;
}

function TablerSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      />
    </svg>
  );
}

function TablerSquares(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M8 10a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </g>
    </svg>
  );
}

export function TitleBar({ title }: TitleBarProps) {
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    setIsElectron(true);
    window.electronAPI.windowIsMaximized().then(setIsMaximized);
    const cleanupMaximize = window.electronAPI.onMaximizeChange(setIsMaximized);
    const cleanupUpdate = window.electronAPI.onUpdateDownloaded(() => setUpdateReady(true));
    return () => {
      cleanupMaximize();
      cleanupUpdate();
    };
  }, []);

  return (
    <div
      className="bg-background/95 flex h-8 shrink-0 items-center border-b backdrop-blur select-none"
      style={isElectron ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
    >
      {/* Left: Current tool name */}
      <div
        className="flex h-full items-center px-3"
        style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        <span className="text-foreground text-sm">{title}</span>
      </div>

      {/* Draggable spacer */}
      <div className="h-full flex-1" />

      {/* Right side: Theme + User */}
      <div
        className="flex h-full items-center gap-1"
        style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        {updateReady && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 animate-pulse cursor-pointer gap-1 px-2 text-xs text-green-500 hover:text-green-400"
            onClick={() => window.electronAPI?.installUpdate()}
          >
            <ArrowDownToLine className="size-3" />
            Güncelle
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 cursor-pointer"
          onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="size-3.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-3.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Tema değiştir</span>
        </Button>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 cursor-pointer">
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
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link href="/login">Giriş Yap</Link>
            </Button>
            <Button size="sm" className="h-7 px-2 text-xs" asChild>
              <Link href="/register">Kayıt Ol</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Window Controls (Electron only) */}
      {isElectron && (
        <div
          className="flex h-full items-center"
          style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
        >
          <div className="bg-border mx-1 h-4 w-px" />
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted h-full w-8 cursor-pointer rounded-none border-none shadow-none"
            onClick={() => window.electronAPI?.windowMinimize()}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted h-full w-8 cursor-pointer rounded-none border-none shadow-none"
            onClick={() => window.electronAPI?.windowMaximize()}
          >
            {isMaximized ? (
              <TablerSquares className="size-3 scale-x-[-1]" />
            ) : (
              <TablerSquare className="size-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-10 cursor-pointer rounded-none border-none shadow-none hover:bg-red-500 hover:text-white"
            onClick={() => window.electronAPI?.windowClose()}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
