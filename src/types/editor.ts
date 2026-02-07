import type { EkapItem, EkapDocument } from '@/lib/ekap-crypto';

export type SortKey = keyof EkapItem | 'siraNoInt';

export interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

export interface TabSession {
  id: string;
  document: EkapDocument;
  fileName: string;
  isDirty: boolean;
  password: string;
  searchQuery: string;
  sortConfig: SortConfig;
}
