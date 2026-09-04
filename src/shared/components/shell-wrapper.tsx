'use client';

import { AppShell } from '@shared/components/app-shell';

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
