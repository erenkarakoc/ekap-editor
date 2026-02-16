// EKAP file encryption/decryption utilities
// Ported from Python implementation

import CryptoJS from 'crypto-js';
import JSZip from 'jszip';
import Decimal from 'decimal.js';

// Configure Decimal for precise financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface EkapItem {
  index: number;
  siraNo: string;
  kalemId: string;
  isKalemiNo: string;
  aciklama: string;
  adet: string;
  adetDecimal: Decimal;
  birim: string;
  fiyat: string;
  fiyatDecimal: Decimal;
  toplam: string;
  toplamDecimal: Decimal;
  kod: string;
  ad: string;
  paraBirimi: string;
  urunKodu: string;
  urunAd: string;
}

export interface TenderInfo {
  iknYil: string;
  iknSayi: string;
  ad: string;
  sonTeklif: string;
  toplam: string;
  toplamYazi: string;
}

export interface EkapDocument {
  items: EkapItem[];
  tenderInfo: TenderInfo;
  xmlContent: string;
  dosyaBilgileri: string;
}

import { parseTurkishNumber, formatTurkishNumber } from '@shared/lib/turkish-number';
export { parseTurkishNumber, formatTurkishNumber };

// Derive AES key from password using SHA1
function deriveKey(password: string): CryptoJS.lib.WordArray {
  const hash = CryptoJS.SHA1(password);
  // Take first 16 bytes (128 bits) for AES-128
  const words = hash.words.slice(0, 4);
  return CryptoJS.lib.WordArray.create(words, 16);
}

// Decrypt EKAP file
export async function decryptEkap(
  fileData: ArrayBuffer,
  password: string,
): Promise<ArrayBuffer | null> {
  try {
    const key = deriveKey(password);

    // Convert ArrayBuffer to WordArray
    const encrypted = CryptoJS.lib.WordArray.create(
      new Uint8Array(fileData) as unknown as number[],
    );

    // Decrypt using AES-ECB
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encrypted } as CryptoJS.lib.CipherParams,
      key,
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      },
    );

    // Convert WordArray to ArrayBuffer
    const decryptedBytes = wordArrayToArrayBuffer(decrypted);

    // Verify ZIP signature (PK\x03\x04)
    const view = new Uint8Array(decryptedBytes);
    if (view[0] !== 0x50 || view[1] !== 0x4b || view[2] !== 0x03 || view[3] !== 0x04) {
      // Invalid signature usually means incorrect password
      return null;
    }

    return decryptedBytes;
  } catch {
    // Decryption can fail due to padding errors with wrong password
    return null;
  }
}

// Encrypt data back to EKAP format
export function encryptEkap(data: ArrayBuffer, password: string): ArrayBuffer {
  const key = deriveKey(password);

  // Convert ArrayBuffer to WordArray
  const plaintext = CryptoJS.lib.WordArray.create(new Uint8Array(data) as unknown as number[]);

  // Encrypt using AES-ECB
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });

  return wordArrayToArrayBuffer(encrypted.ciphertext);
}

// Helper to convert WordArray to ArrayBuffer
function wordArrayToArrayBuffer(wordArray: CryptoJS.lib.WordArray): ArrayBuffer {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8 = new Uint8Array(sigBytes);

  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return u8.buffer;
}

// Parse EKAP document from ZIP
export async function parseEkapDocument(zipData: ArrayBuffer): Promise<EkapDocument | null> {
  try {
    const zip = await JSZip.loadAsync(zipData);

    // Get XML files
    const teklifFile = zip.file('teklifDosyasi.xml');
    const dosyaFile = zip.file('dosyaBilgileri.xml');

    if (!teklifFile) {
      console.error('teklifDosyasi.xml not found in ZIP');
      return null;
    }

    const xmlContent = await teklifFile.async('string');
    const dosyaBilgileri = dosyaFile ? await dosyaFile.async('string') : '';

    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // Parse tender info
    const tenderInfo = parseTenderInfo(doc);

    // Parse items
    const items = parseItems(doc);

    return {
      items,
      tenderInfo,
      xmlContent,
      dosyaBilgileri,
    };
  } catch (error) {
    console.error('Failed to parse EKAP document:', error);
    return null;
  }
}

function parseTenderInfo(doc: Document): TenderInfo {
  const ihale = doc.querySelector('Ihale');

  return {
    iknYil: ihale?.getAttribute('IKNYil') || '',
    iknSayi: ihale?.getAttribute('IKNSayi') || '',
    ad: ihale?.getAttribute('Ad') || '',
    sonTeklif: ihale?.getAttribute('SonTeklifTarihSaat') || '',
    toplam: ihale?.getAttribute('IhaleTeklifToplam') || '',
    toplamYazi: ihale?.getAttribute('IhaleTeklifToplamYazi') || '',
  };
}

function parseItems(doc: Document): EkapItem[] {
  const items: EkapItem[] = [];
  const kalemler = doc.querySelectorAll('IhaleKalem');

  kalemler.forEach((kalem, index) => {
    const getAttr = (attr: string): string => kalem.getAttribute(attr) || '';
    const getChildText = (selector: string): string => {
      const child = kalem.querySelector(selector);
      return child?.textContent || '';
    };

    // Adet: from Adet attribute (Turkish number format)
    const adet = getAttr('Adet') || '0';

    // Fiyat: from Teklif > Fiyat element text content
    const fiyatRaw = getChildText('Teklif > Fiyat') || '0';
    const fiyatDecimal = parseTurkishNumber(fiyatRaw);

    // Toplam: from Teklif > KalemTeklifToplam element text content
    const toplamRaw = getChildText('Teklif > KalemTeklifToplam') || '0';
    const toplamDecimal = parseTurkishNumber(toplamRaw);

    items.push({
      index: index + 1,
      siraNo: getAttr('SiraNo') || String(index + 1),
      kalemId: getAttr('Id') || '',
      kod: getAttr('Kod') || '',
      ad: getAttr('Ad') || '',
      isKalemiNo: getChildText('IsKalemiNo') || '',
      aciklama: getAttr('Aciklama') || '',
      adet,
      adetDecimal: parseTurkishNumber(adet),
      paraBirimi: getChildText('Teklif > ParaBirimi') || 'TRY',
      birim: getAttr('TicariSunumSekli') || '',
      urunKodu: getChildText('Teklif > UrunKodu') || '',
      urunAd: getChildText('Teklif > UrunAd') || '',
      fiyat: formatTurkishNumber(fiyatDecimal),
      fiyatDecimal,
      toplam: formatTurkishNumber(toplamDecimal),
      toplamDecimal,
    });
  });

  return items;
}

// Update item price and recalculate totals
export function updateItemPrice(
  document: EkapDocument,
  itemIndex: number,
  newPrice: Decimal,
): EkapDocument {
  const items = [...document.items];
  const item = items.find((i) => i.index === itemIndex);

  if (!item) return document;

  // Update price
  item.fiyatDecimal = newPrice;
  item.fiyat = formatTurkishNumber(newPrice);

  // Recalculate total
  item.toplamDecimal = item.adetDecimal.times(newPrice);
  item.toplam = formatTurkishNumber(item.toplamDecimal);

  // Recalculate grand total using Decimal reduce
  const grandTotal = items.reduce((sum, i) => sum.plus(i.toplamDecimal), new Decimal(0));

  return {
    ...document,
    items,
    tenderInfo: {
      ...document.tenderInfo,
      toplam: formatTurkishNumber(grandTotal),
    },
  };
}

// Create ZIP from document
export async function createEkapZip(document: EkapDocument): Promise<ArrayBuffer> {
  const zip = new JSZip();

  // Update XML content with new values
  const parser = new DOMParser();
  const doc = parser.parseFromString(document.xmlContent, 'text/xml');

  // Update item prices in XML
  const kalemler = doc.querySelectorAll('IhaleKalem');
  let ihaleToplam = new Decimal(0);

  document.items.forEach((item, index) => {
    const kalem = kalemler[index];
    if (!kalem) return;

    // Update Teklif > Fiyat and Teklif > KalemTeklifToplam
    let teklifEl = kalem.querySelector('Teklif');

    // Teklif elementi yoksa oluştur (orijinalde fiyatı boş olan kalemler için)
    if (!teklifEl) {
      teklifEl = doc.createElement('Teklif');

      const children: Record<string, string> = {
        TeklifId: String(index + 1),
        ManuelEkleme: 'true',
        ParaBirimi: item.paraBirimi || 'TRY',
        UrunKodu: item.urunKodu || '',
        UrunAd: item.urunAd || '',
        Adet: item.adet,
        TicariSunumSekli: item.birim,
        Fiyat: item.fiyat,
        Aciklama: '',
        IslemTanim: '',
        KalemId: kalem.getAttribute('Id') || '',
        FirmaBayiTur: '',
        FirmaBayiNo: '',
        FirmaTicariAd: '',
        KalemTeklifToplam: item.toplam,
        PersonelHizmetAlimMi: kalem.getAttribute('PersonelHizmetAlimMi') || '0',
        IsKalemiTuru: kalem.querySelector('IsKalemiTuru')?.textContent || '',
      };

      for (const [tag, value] of Object.entries(children)) {
        const el = doc.createElement(tag);
        el.textContent = value;
        teklifEl.appendChild(el);
      }

      kalem.appendChild(teklifEl);
    }

    const fiyatEl = teklifEl.querySelector('Fiyat');
    if (fiyatEl) {
      fiyatEl.textContent = item.fiyat;
    }
    const kalemToplamEl = teklifEl.querySelector('KalemTeklifToplam');
    if (kalemToplamEl) {
      kalemToplamEl.textContent = item.toplam;
    }

    // Update parent IhaleKalemler's KalemTeklifToplam attribute
    // Each IhaleKalem has its own parent IhaleKalemler element
    const ihaleKalemlerParent = kalem.parentElement;
    if (ihaleKalemlerParent?.tagName === 'IhaleKalemler') {
      ihaleKalemlerParent.setAttribute('KalemTeklifToplam', item.toplam);
    }

    // Accumulate for grand total
    ihaleToplam = ihaleToplam.plus(item.toplamDecimal);
  });

  // Update Kisim KisimTeklifToplam attribute (sum of all items)
  const kisimEl = doc.querySelector('Kisim');
  if (kisimEl) {
    kisimEl.setAttribute('KisimTeklifToplam', formatTurkishNumber(ihaleToplam));
  }

  // Update Ihale IhaleTeklifToplam attribute
  const ihaleEl = doc.querySelector('Ihale');
  if (ihaleEl) {
    ihaleEl.setAttribute('IhaleTeklifToplam', formatTurkishNumber(ihaleToplam));
  }

  // Serialize XML
  const serializer = new XMLSerializer();
  const updatedXml = serializer.serializeToString(doc);

  zip.file('teklifDosyasi.xml', updatedXml);
  zip.file('dosyaBilgileri.xml', document.dosyaBilgileri || '<KIKEKAP />');

  return await zip.generateAsync({ type: 'arraybuffer' });
}
