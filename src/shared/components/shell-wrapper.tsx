'use client';

import { ProjectSessionProvider } from '@features/projects/components/project-session';
import { AppShell } from '@shared/components/app-shell';

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  return <ProjectSessionProvider><AppShell>{children}</AppShell></ProjectSessionProvider>;
}
