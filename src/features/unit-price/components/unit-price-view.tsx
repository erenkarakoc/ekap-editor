'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@shared/components/ui/input';
import { Card, CardContent } from '@shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { formatTurkishNumber } from '@shared/lib/turkish-number';
import { ANALYSIS_DATA } from '../data/analysis-data';
import { searchPoz } from '@features/cost-estimate/data/mock-database';
import type { PozWithAnalysis } from '../types';
import type { PozEntry } from '@features/cost-estimate/types';
import { AnalysisDetail } from './analysis-detail';

type InstitutionFilter = 'all' | 'DSI' | 'CSB' | 'KTB';

const TABS: { value: InstitutionFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'DSI', label: 'DSİ' },
  { value: 'CSB', label: 'ÇŞB' },
  { value: 'KTB', label: 'KTB' },
];

export function UnitPriceView() {
  const [query, setQuery] = useState('');
  const [institution, setInstitution] = useState<InstitutionFilter>('all');
  const [selectedPozNo, setSelectedPozNo] = useState<string | null>(null);

  // Merge mock database entries with analysis data
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const mockResults = searchPoz(query);
    const analysisMap = new Map(ANALYSIS_DATA.map((a) => [a.pozNo, a]));

    const merged: PozWithAnalysis[] = mockResults.map((entry) => {
      const analysis = analysisMap.get(entry.pozNo);
      if (analysis) return analysis;
      return { ...entry };
    });

    // Add analysis entries that weren't in mock results
    for (const a of ANALYSIS_DATA) {
      if (
        !merged.some((m) => m.pozNo === a.pozNo) &&
        (a.pozNo.toLowerCase().includes(query.toLowerCase()) ||
          a.description.toLowerCase().includes(query.toLowerCase()))
      ) {
        merged.push(a);
      }
    }

    if (institution !== 'all') {
      return merged.filter((e) => e.institution === institution);
    }

    return merged;
  }, [query, institution]);

  const selectedPoz = useMemo(
    () => results.find((r) => r.pozNo === selectedPozNo) ?? null,
    [results, selectedPozNo],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search Bar + Tabs */}
      <div className="bg-muted/20 space-y-2 border-b px-4 py-3">
        <div className="relative mx-auto max-w-xl">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Poz no veya açıklama ile arayın..."
            className="bg-background h-10 pl-9 focus-visible:ring-1"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedPozNo(null);
            }}
          />
        </div>
        <div className="flex justify-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setInstitution(tab.value)}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                institution === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className={`overflow-auto border-r ${selectedPoz ? 'w-1/2' : 'w-full'}`}>
          {query.trim() === '' ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Poz aramak için yukarıdaki arama kutusunu kullanın.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">Sonuç bulunamadı.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Poz No</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="w-16">Birim</TableHead>
                  <TableHead className="w-28 text-right">Birim Fiyat</TableHead>
                  <TableHead className="w-16">Kurum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((entry) => {
                  const hasAnalysis = !!(entry as PozWithAnalysis).analysis;
                  return (
                    <TableRow
                      key={entry.pozNo}
                      className={`cursor-pointer ${
                        selectedPozNo === entry.pozNo ? 'bg-muted' : ''
                      } ${hasAnalysis ? '' : 'opacity-60'}`}
                      onClick={() => setSelectedPozNo(entry.pozNo)}
                    >
                      <TableCell className="font-mono text-xs">{entry.pozNo}</TableCell>
                      <TableCell className="text-sm">{entry.description}</TableCell>
                      <TableCell className="text-xs">{entry.unit}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatTurkishNumber(entry.unitPrice)}
                      </TableCell>
                      <TableCell className="text-xs">{entry.institution}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Detail Panel */}
        {selectedPoz && (
          <div className="w-1/2 overflow-auto p-4">
            <AnalysisDetail poz={selectedPoz} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-muted/40 flex shrink-0 items-center justify-between border-t px-4 py-1.5 text-sm">
        <span className="text-muted-foreground">
          {results.length > 0 ? `${results.length} sonuç` : ''}
        </span>
        <span className="text-muted-foreground text-xs">
          Analiz verisi olan pozlar koyu, olmayan pozlar soluk gösterilir.
        </span>
      </div>
    </div>
  );
}
