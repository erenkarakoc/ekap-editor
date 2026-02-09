import Decimal from 'decimal.js';
import type { PozEntry } from '../types';

const MOCK_DATA: PozEntry[] = [
  // DSI - Su Yapıları
  { pozNo: '50.101.1001', description: 'Kum-çakıl karışımı ile dolgu yapılması', unit: 'm³', unitPrice: new Decimal('85.50'), institution: 'DSI' },
  { pozNo: '50.101.1002', description: 'Kaya dolgu yapılması', unit: 'm³', unitPrice: new Decimal('72.30'), institution: 'DSI' },
  { pozNo: '50.103.1001', description: 'Her derinlikte toprak kazılması', unit: 'm³', unitPrice: new Decimal('34.80'), institution: 'DSI' },
  { pozNo: '50.103.1002', description: 'Her derinlikte yumuşak kaya kazılması', unit: 'm³', unitPrice: new Decimal('58.60'), institution: 'DSI' },
  { pozNo: '50.103.1003', description: 'Her derinlikte sert kaya kazılması', unit: 'm³', unitPrice: new Decimal('95.20'), institution: 'DSI' },
  { pozNo: '50.205.1001', description: 'C16/20 basınç dayanım sınıfında beton dökülmesi', unit: 'm³', unitPrice: new Decimal('520.00'), institution: 'DSI' },
  { pozNo: '50.205.1002', description: 'C20/25 basınç dayanım sınıfında beton dökülmesi', unit: 'm³', unitPrice: new Decimal('565.00'), institution: 'DSI' },
  { pozNo: '50.205.1003', description: 'C25/30 basınç dayanım sınıfında beton dökülmesi', unit: 'm³', unitPrice: new Decimal('610.00'), institution: 'DSI' },
  { pozNo: '50.205.1004', description: 'C30/37 basınç dayanım sınıfında beton dökülmesi', unit: 'm³', unitPrice: new Decimal('680.00'), institution: 'DSI' },
  { pozNo: '50.301.1001', description: 'Nervürlü çelik hasır imalatı ve yerine konulması', unit: 'ton', unitPrice: new Decimal('12500.00'), institution: 'DSI' },
  { pozNo: '50.301.1002', description: 'Ø8-Ø32 nervürlü beton çeliği', unit: 'ton', unitPrice: new Decimal('14200.00'), institution: 'DSI' },
  { pozNo: '50.405.1001', description: 'Boru döşenmesi (Ø100mm HDPE)', unit: 'm', unitPrice: new Decimal('180.00'), institution: 'DSI' },
  { pozNo: '50.405.1002', description: 'Boru döşenmesi (Ø200mm HDPE)', unit: 'm', unitPrice: new Decimal('340.00'), institution: 'DSI' },
  { pozNo: '50.405.1003', description: 'Boru döşenmesi (Ø300mm HDPE)', unit: 'm', unitPrice: new Decimal('520.00'), institution: 'DSI' },
  { pozNo: '50.501.1001', description: 'Düz yüzeyli kalıp yapılması', unit: 'm²', unitPrice: new Decimal('145.00'), institution: 'DSI' },

  // CSB - Çevre ve Şehircilik
  { pozNo: 'Y.15.001/01', description: 'Makine ile her derinlikte yumuşak ve sert toprak kazılması', unit: 'm³', unitPrice: new Decimal('28.50'), institution: 'CSB' },
  { pozNo: 'Y.15.001/02', description: 'Makine ile her derinlikte yumuşak kaya kazılması', unit: 'm³', unitPrice: new Decimal('48.00'), institution: 'CSB' },
  { pozNo: 'Y.16.050/13', description: 'C25/30 basınç dayanım sınıfında beton dökülmesi (BS 25)', unit: 'm³', unitPrice: new Decimal('595.00'), institution: 'CSB' },
  { pozNo: 'Y.16.050/14', description: 'C30/37 basınç dayanım sınıfında beton dökülmesi (BS 30)', unit: 'm³', unitPrice: new Decimal('650.00'), institution: 'CSB' },
  { pozNo: 'Y.21.001/01', description: 'Düz yüzeyli beton ve betonarme kalıbı', unit: 'm²', unitPrice: new Decimal('130.00'), institution: 'CSB' },
  { pozNo: 'Y.23.010', description: 'Ø8-Ø12mm nervürlü beton çeliği', unit: 'ton', unitPrice: new Decimal('13800.00'), institution: 'CSB' },
  { pozNo: 'Y.23.014', description: 'Ø14-Ø28mm nervürlü beton çeliği', unit: 'ton', unitPrice: new Decimal('13200.00'), institution: 'CSB' },
  { pozNo: 'Y.25.001/01', description: 'Tuğla duvar örülmesi (19cm)', unit: 'm²', unitPrice: new Decimal('185.00'), institution: 'CSB' },
  { pozNo: 'Y.27.501/01', description: 'İç cephe sıvası yapılması', unit: 'm²', unitPrice: new Decimal('68.00'), institution: 'CSB' },
  { pozNo: 'Y.27.501/02', description: 'Dış cephe sıvası yapılması', unit: 'm²', unitPrice: new Decimal('82.00'), institution: 'CSB' },
  { pozNo: 'Y.18.001/01', description: 'Projeye göre her türlü demir işleri yapılması', unit: 'kg', unitPrice: new Decimal('32.50'), institution: 'CSB' },

  // KTB - Karayolları
  { pozNo: 'KGM/6100', description: 'Bitümlü sıcak karışım aşınma tabakası yapılması', unit: 'ton', unitPrice: new Decimal('420.00'), institution: 'KTB' },
  { pozNo: 'KGM/6200', description: 'Bitümlü sıcak karışım binder tabakası yapılması', unit: 'ton', unitPrice: new Decimal('380.00'), institution: 'KTB' },
  { pozNo: 'KGM/6310', description: 'Plentmiks temel tabakası yapılması', unit: 'm³', unitPrice: new Decimal('195.00'), institution: 'KTB' },
  { pozNo: 'KGM/6410', description: 'Plentmiks alttemel tabakası yapılması', unit: 'm³', unitPrice: new Decimal('165.00'), institution: 'KTB' },
  { pozNo: 'KGM/2200', description: 'Her cins ve klastaki zeminde yarma kazısı', unit: 'm³', unitPrice: new Decimal('22.50'), institution: 'KTB' },
  { pozNo: 'KGM/2300', description: 'Her cins ve klastaki zeminde ariyet kazısı yapılması', unit: 'm³', unitPrice: new Decimal('18.80'), institution: 'KTB' },
  { pozNo: 'KGM/3100', description: 'C20/25 hazır beton ile imalat yapılması', unit: 'm³', unitPrice: new Decimal('580.00'), institution: 'KTB' },
  { pozNo: 'KGM/3200', description: 'C30/37 hazır beton ile imalat yapılması', unit: 'm³', unitPrice: new Decimal('660.00'), institution: 'KTB' },
  { pozNo: 'KGM/4100', description: 'Nervürlü beton çeliği temini ve yerine konulması', unit: 'ton', unitPrice: new Decimal('13500.00'), institution: 'KTB' },
  { pozNo: 'KGM/5100', description: 'Düz yüzeyli betonarme kalıbı yapılması', unit: 'm²', unitPrice: new Decimal('138.00'), institution: 'KTB' },
  { pozNo: 'KGM/7100', description: 'Beton bordür döşenmesi (50x20x70)', unit: 'm', unitPrice: new Decimal('95.00'), institution: 'KTB' },
  { pozNo: 'KGM/7200', description: 'Beton parke taşı döşenmesi (8cm)', unit: 'm²', unitPrice: new Decimal('110.00'), institution: 'KTB' },
];

export function searchPoz(query: string): PozEntry[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return MOCK_DATA.filter(
    (entry) =>
      entry.pozNo.toLowerCase().includes(lowerQuery) ||
      entry.description.toLowerCase().includes(lowerQuery),
  );
}
