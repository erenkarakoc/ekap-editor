import Decimal from 'decimal.js';
import type { PozEntry } from '@features/cost-estimate/types';

export type AnalysisCategory = 'malzeme' | 'iscilik' | 'makine' | 'nakliye';

export interface AnalysisItem {
  code: string;
  description: string;
  unit: string;
  quantity: Decimal;
  unitPrice: Decimal;
  category: AnalysisCategory;
}

export interface PozWithAnalysis extends PozEntry {
  analysis?: AnalysisItem[];
  profitRate?: number; // kar ve genel gider oranı (default %25)
}
