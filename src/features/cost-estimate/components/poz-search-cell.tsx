'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@shared/components/ui/input';
import { Badge } from '@shared/components/ui/badge';
import { searchPoz } from '../data/mock-database';
import type { PozEntry } from '../types';

const INSTITUTION_COLORS: Record<string, string> = {
  DSI: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CSB: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  KTB: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

interface PozSearchCellProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (entry: PozEntry) => void;
  autoFocus?: boolean;
}

export function PozSearchCell({ value, onChange, onSelect, autoFocus }: PozSearchCellProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const results = query.trim().length > 0 ? searchPoz(query) : [];

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleSelect = useCallback(
    (entry: PozEntry) => {
      setQuery(entry.pozNo);
      setIsOpen(false);
      onSelect(entry);
    },
    [onSelect],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter') {
        onChange(query);
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        } else {
          onChange(query);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Group results by institution
  const grouped = results.reduce(
    (acc, entry) => {
      if (!acc[entry.institution]) acc[entry.institution] = [];
      acc[entry.institution].push(entry);
      return acc;
    },
    {} as Record<string, PozEntry[]>,
  );

  let flatIndex = -1;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        className="h-8 font-mono text-sm"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        placeholder="Poz No"
      />
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 max-h-64 w-80 overflow-auto rounded-md border shadow-lg"
        >
          {Object.entries(grouped).map(([institution, entries]) => (
            <div key={institution}>
              <div className="text-muted-foreground bg-muted/80 sticky top-0 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                {institution}
              </div>
              {entries.map((entry) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <div
                    key={entry.pozNo}
                    className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm ${
                      idx === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(entry);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${INSTITUTION_COLORS[entry.institution] || ''}`}
                    >
                      {entry.institution}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-medium">{entry.pozNo}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {entry.description}
                      </div>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">{entry.unit}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
