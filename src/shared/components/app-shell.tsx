'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
  const router = useRouter();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Find current tool name based on pathname
  const currentTitle = useMemo(() => {
    if (pathname === '/' || pathname === '') return 'Ana Sayfa';
    if (pathname === '/user') return 'Hesap Ayarları';
    const tool = TOOLS.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'));
    return tool?.label ?? 'EKAP Editör';
  }, [pathname]);

  // Global keyboard shortcuts
  const shortcuts = useMemo<KeyboardShortcut[]>(
    () => [{ key: 'b', ctrl: true, handler: () => toggleSidebar() }],
    [toggleSidebar, router],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <AppSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Right side: title bar + content + status bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Title Bar */}
        <TitleBar title={currentTitle} />

        {/* Main Content Area (feature views live here) */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
