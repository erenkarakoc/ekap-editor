import type { EkapItem, EkapDocument } from '@features/editor/lib/ekap-crypto';

// Editor types
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

// Home view types (used by dashboard/home-view within editor feature)
export interface RecentFile {
  id: string;
  name: string;
  lastOpened: number;
  path?: string;
  size?: number;
}

export interface SessionSummary {
  id: string;
  fileName: string;
  isDirty: boolean;
}
