'use client';

interface StatusBarProps {
  children?: React.ReactNode;
}

export function StatusBar({ children }: StatusBarProps) {
  return (
    <div className="bg-muted/40 flex h-7 shrink-0 items-center justify-between border-t px-3 text-xs">
      {children}
    </div>
  );
}
