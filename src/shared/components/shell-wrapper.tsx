'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@shared/components/app-shell';

const AUTH_ROUTES = ['/login', '/register'];

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
