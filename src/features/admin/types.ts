export interface PozAktarimSatiri {
  poz: string;
  description: string;
  unit: string | null;
  unit_price: string | null;
  montage_price: string | null;
  demontage_price: string | null;
  old_poz: string | null;
  description_prefix: string | null;
  description_suffix: string | null;
  category: string | null;
  sub_category: string | null;
  buy_place: string | null;
  fascicle: string | null;
  note: string | null;
  page: number;
  source_row: number;
  source_table: string | null;
  record_type: 'unit_price' | 'rayic' | 'karsiz' | 'other';
}

export interface AktarimDogrulamaHatasi {
  satir: number;
  alan: string;
  mesaj: string;
}

export interface AktarimDosyasi {
  satirlar: PozAktarimSatiri[];
  hatalar: AktarimDogrulamaHatasi[];
  dosyaAdi: string;
  bicim: string;
}
