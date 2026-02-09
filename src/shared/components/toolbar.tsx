'use client';

interface ToolbarProps {
  children?: React.ReactNode;
}

export function Toolbar({ children }: ToolbarProps) {
  if (!children) return null;
  return (
    <div className="bg-muted/20 flex h-10 shrink-0 items-center gap-1 border-b px-2">
      {children}
    </div>
  );
}
