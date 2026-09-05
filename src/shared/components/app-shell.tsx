'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { AppSidebar, TOOLS } from '@shared/components/app-sidebar';
import { TitleBar } from '@shared/components/title-bar';
import { useKeyboardShortcuts } from '@shared/hooks/use-keyboard-shortcuts';
import type { KeyboardShortcut } from '@shared/hooks/use-keyboard-shortcuts';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const showAppSidebar = !isAdminPage && !isAuthPage;

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Find current tool name based on pathname
  const currentTitle = useMemo(() => {
    if (pathname === '/' || pathname === '') return 'Ana Sayfa';
    if (pathname.startsWith('/admin')) return 'Yönetim merkezi';
    if (pathname.startsWith('/login')) return 'Giriş yap';
    if (pathname.startsWith('/register')) return 'Hesap oluştur';
    if (pathname === '/user') return 'Hesap Ayarları';
    const tool = TOOLS.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'));
    return tool?.label ?? 'İcmal';
  }, [pathname]);

  // Global keyboard shortcuts
  const shortcuts = useMemo<KeyboardShortcut[]>(
    () => [{ key: 'b', ctrl: true, handler: () => toggleSidebar() }],
    [toggleSidebar],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <TitleBar title={currentTitle} showAppReturn={isAdminPage} />

      <div className="flex min-h-0 flex-1">
        {showAppSidebar && <AppSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}
        {isAdminPage ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        ) : (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
        )}
      </div>
    </div>
  );
}
