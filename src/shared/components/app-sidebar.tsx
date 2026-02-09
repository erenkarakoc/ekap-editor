'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Calculator,
  Target,
  Search,
  TrendingUp,
  Percent,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { Kbd } from '@shared/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip';

export interface SidebarTool {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

export const TOOLS: SidebarTool[] = [
  { id: 'editor', label: 'EKAP Editör', href: '/editor', icon: FileText },
  {
    id: 'cost-estimate',
    label: 'Yaklaşık Maliyet',
    href: '/yaklasik-maliyet',
    icon: Calculator,
  },
  { id: 'threshold', label: 'Sınır Değer', href: '/sinir-deger', icon: Target },
  {
    id: 'unit-price',
    label: 'Birim Fiyat',
    href: '/birim-fiyat',
    icon: Search,
  },
  {
    id: 'price-diff',
    label: 'Fiyat Farkı',
    href: '/fiyat-farki',
    icon: TrendingUp,
  },
  {
    id: 'percentage-cost',
    label: 'Maliyet Sihirbazı',
    href: '/maliyet-sihirbazi',
    icon: Percent,
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full shrink-0 flex-col border-r transition-[width] duration-200',
        collapsed ? 'w-12' : 'w-[220px]',
      )}
    >
      {/* Logo / App Name */}
      <div className="flex h-8 shrink-0 items-center border-b px-3">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <FileText className="size-4 shrink-0" />
          {!collapsed && (
            <span className="truncate text-sm font-bold tracking-tight">EKAP Editör</span>
          )}
        </Link>
      </div>

      {/* Tool Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-2">
        {TOOLS.map((tool) => {
          const isActive = pathname === tool.href || pathname.startsWith(tool.href + '/');
          const IconComponent = tool.icon;

          const button = (
            <Link
              key={tool.id}
              href={tool.href}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <IconComponent className="size-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{tool.label}</span>
                  {tool.shortcut && (
                    <Kbd variant="ghost" className="text-sidebar-foreground/40 hidden lg:inline">
                      {tool.shortcut}
                    </Kbd>
                  )}
                </>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={tool.id} delayDuration={0}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <span>{tool.label}</span>
                  {tool.shortcut && (
                    <span className="text-muted-foreground ml-2 text-xs">{tool.shortcut}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </nav>

      {/* Bottom: Collapse Toggle */}
      <div className="border-t px-1.5 py-1.5">
        <button
          onClick={onToggle}
          className="text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground flex h-7 w-full items-center gap-2.5 rounded-md px-2 text-sm transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="size-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" />
              <span className="flex-1 truncate text-left">Daralt</span>
              <Kbd variant="ghost" className="text-sidebar-foreground/40">
                Ctrl+B
              </Kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
