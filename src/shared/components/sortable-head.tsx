'use client';

import React, { useState, useRef } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  ArrowLeftRight,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
} from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { TableHead } from '@shared/components/ui/table';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@shared/components/ui/context-menu';

export interface SortableHeadProps<T extends string = string> {
  label: string;
  sortKey: T;
  activeConfig: { key: T | null; direction: 'asc' | 'desc' | null };
  onSort: (key: T) => void;
  onSortExplicit?: (key: T, direction: 'asc' | 'desc') => void;
  width: number;
  onResize: (width: number) => void;
  onHide?: (key: string) => void;
  onFit?: (key: string) => void;
  onShrink?: (key: string) => void;
  className?: string;
}

export const SortableHead = React.memo(function SortableHead<T extends string = string>({
  label,
  sortKey,
  activeConfig,
  onSort,
  onSortExplicit,
  width,
  onResize,
  onHide,
  onFit,
  className,
}: SortableHeadProps<T>) {
  const isSorted = activeConfig.key === sortKey;
  const direction = isSorted ? activeConfig.direction : null;

  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.pageX;
    startWidth.current = width;

    const handleMouseMove = (em: MouseEvent) => {
      const diff = em.pageX - startX.current;
      onResize(Math.max(40, startWidth.current + diff));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <TableHead
      className={cn(
        'text-foreground border-border group bg-muted/50 relative h-10 border-r border-b p-0 font-bold select-none',
        className,
      )}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <ContextMenu>
        <ContextMenuTrigger className="h-full w-full">
          <div
            className="hover:bg-muted flex h-full w-full cursor-pointer items-center justify-between px-2 transition-colors"
            onClick={() => onSort(sortKey)}
          >
            <span className="truncate text-xs">{label}</span>
            <div className="flex items-center">
              {direction === 'asc' ? (
                <ArrowUp className="text-primary size-3.5" />
              ) : direction === 'desc' ? (
                <ArrowDown className="text-primary size-3.5" />
              ) : (
                <ArrowUpDown className="text-muted-foreground/30 group-hover:text-muted-foreground/60 size-3.5 transition-colors" />
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => onHide?.(sortKey)} className="cursor-pointer gap-2">
            <EyeOff className="size-4" />
            <span>Gizle</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onFit?.(sortKey)} className="cursor-pointer gap-2">
            <ArrowLeftRight className="size-4" />
            <span>Sığdır</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onSortExplicit?.(sortKey, 'asc')}
            className="cursor-pointer gap-2"
          >
            <ArrowUpNarrowWide className="size-4" />
            <span>Sırala - Artan</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onSortExplicit?.(sortKey, 'desc')}
            className="cursor-pointer gap-2"
          >
            <ArrowDownWideNarrow className="size-4" />
            <span>Sırala - Azalan</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'hover:bg-primary/50 absolute top-0 right-0 bottom-0 z-10 w-1 cursor-col-resize transition-colors',
          isResizing && 'bg-primary w-0.5',
        )}
      />
    </TableHead>
  );
}) as <T extends string = string>(props: SortableHeadProps<T>) => React.ReactElement;
