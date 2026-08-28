// Extracts the merged birim fiyat kitabı (kitap.pdf) into structured rows.
//
// This book states its own structure, so nothing has to be guessed:
//
//   25.150.1300  [bold, no price]  Prizmatik Modüler Galvanizli Su Deposu   <- heading
//                (specification paragraphs)
//   25.150.1319  [normal, price]   59,6 m3                                  <- item
//
// A heading's poz ends in zeros, and stripping them gives the prefix it covers
// (25.150.1300 -> 25.150.13**), so every item's heading chain follows from its
// own poz number rather than from indentation guesswork. The composed
// description is what the teklif cetveli actually writes:
// "59,6 m³ Prizmatik Modüler Galvanizli Su Deposu".
//
//   node scripts/kitap-to-rows.mjs data/books/new/kitap.pdf

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Poz numbering differs by institution, and the format decides what counts as a
// row at all. ÇŞB writes 35.100.1101; TEDAŞ writes 30.4.2 / 32.5-002 /
// 32.12.7-333. Selected with --poz, because a single permissive pattern would
// also swallow prices like "1.469".
const POZ_FORMATS = {
  csb: /^\d{2}\.\d{3}\.\d+$/,
  tedas: /^\d{1,2}(?:[.\-/]\d{1,3}){1,3}$/,
};

const formatFlag = process.argv.indexOf('--poz');
const formatName = formatFlag === -1 ? 'csb' : process.argv[formatFlag + 1];
const POZ = POZ_FORMATS[formatName];
if (!POZ) {
  console.error(`bilinmeyen poz formatı: ${formatName} (${Object.keys(POZ_FORMATS).join(', ')})`);
  process.exit(1);
}
const PRICE = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;
const SECTION = /^\d{2}\.\d{3}\.-/;
const FOOTER = /^-\s*\d+\s*-$/;

const parsePrice = (text) => Number.parseFloat(text.replace(/\./g, '').replace(',', '.'));

function toLines(items) {
  const lines = [];
  for (const item of items) {
    const text = item.str.trim();
    if (!text) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const line = lines.find((l) => Math.abs(l.y - y) < 3);
    const cell = { x, right: x + (item.width ?? 0), text, font: item.fontName };
    if (line) line.cells.push(cell);
    else lines.push({ y, cells: [cell] });
  }
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) line.cells.sort((a, b) => a.x - b.x);
  return lines;
}

/**
 * The page's own column header tells us the layout and, because it is set in
 * bold, which font marks a heading. Font names differ between sections, so this
 * is read per page rather than hardcoded.
 */
function readHeader(lines) {
  for (const line of lines) {
    const poz = line.cells.find((c) => /^Poz\s*No$/i.test(c.text));
    if (!poz) continue;

    const near = lines.filter((l) => Math.abs(l.y - line.y) < 20);
    const labels = near.flatMap((l) => l.cells);
    const at = (pattern) => labels.find((c) => pattern.test(c.text));

    return {
      boldFont: poz.font,
      pozRight: poz.right,
      unit: at(/^(Ölçü|Birimi)$/i)?.x ?? null,
      // "Satın Alma Yeri" on rayiç pages is not part of the description
      source: at(/Satın\s*Alma/i)?.x ?? null,
      price: at(/Birim Fiyat|Rayiç Fiyatı|Montajlı/i)?.x ?? null,
      assembly: at(/Montaj Bedeli/i)?.x ?? null,
    };
  }
  return null;
}

/** "25.150.1300" -> "25.150.13"; an item poz returns null. */
function headingPrefix(poz) {
  const [group, family, item] = poz.split('.');
  const trimmed = item.replace(/0+$/, '');
  return trimmed === item ? null : `${group}.${family}.${trimmed}`;
}

async function extract(path) {
  const document = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(path)),
    useSystemFonts: true,
  }).promise;

  const rows = [];
  let stack = [];
  let floating = '';
  let section = '';
  let last = null;
  let subColumns = null;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const lines = toLines((await page.getTextContent()).items);
    const header = readHeader(lines);
    if (!header) continue;

    const priceLeft = Math.min(header.price ?? Infinity, header.assembly ?? Infinity) - 30;

    for (const line of lines) {
      // the rotated "Sıra No" label down the left margin, and page footers
      const cells = line.cells.filter(
        (c) => !(c.x < 50 && c.text.length <= 2 && !POZ.test(c.text)) && !FOOTER.test(c.text),
      );
      if (cells.length === 0) continue;
      if (line.y > 765) {
        const title = cells.find((c) => SECTION.test(c.text));
        if (title) section = title.text.replace(/^\d{2}\.\d{3}\.-/, '').trim();
        continue;
      }
      if (cells.some((c) => /^Poz\s*No$/i.test(c.text))) continue;

      const poz = cells.find((c) => POZ.test(c.text) && c.x < header.pozRight + 20);
      const prices = cells.filter((c) => PRICE.test(c.text) && c.x > priceLeft);
      const unitCell =
        header.unit === null
          ? null
          : cells.find((c) => Math.abs(c.x - header.unit) < 45 && c.x < priceLeft && c !== poz);

      const describing = cells.filter(
        (c) =>
          c !== poz &&
          c !== unitCell &&
          !prices.includes(c) &&
          c.x < priceLeft &&
          !(header.source !== null && Math.abs(c.x - header.source) < 45),
      );
      const text = describing
        .map((c) => c.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const bold = cells.some((c) => c.font === header.boldFont);

      if (!poz) {
        if (!text) continue;

        // Pipe and profile families print a sub-table with its own headers
        // ("Anma Ölçüsü | Dış çap/Et kalınlığı | Manşonsuz ağırlık"). Only the
        // first of those columns names the item; the rest are engineering data
        // that would otherwise be glued into the description.
        if (prices.length === 0 && describing.length >= 2) {
          const xs = describing.map((c) => c.x);
          if (xs[1] - xs[0] > 25) {
            subColumns = xs;
            continue;
          }
        }

        if (bold) {
          // a heading with no poz of its own governs the rows beneath it
          floating = text;
          last = null;
        } else if (last) {
          // continuation line: belongs to the row it follows
          last.description += ` ${text}`;
        }
        continue;
      }

      if (prices.length === 0) {
        // heading row: scope comes from the trailing zeros of its own poz
        const prefix = headingPrefix(poz.text) ?? poz.text;
        stack = stack.filter((h) => prefix.startsWith(h.prefix) && h.prefix !== prefix);
        stack.push({ prefix, text });
        floating = '';
        last = null;
        subColumns = null;
        continue;
      }

      const chain = stack.filter((h) => poz.text.startsWith(h.prefix)).map((h) => h.text);
      if (floating) chain.push(floating);

      // inside a sub-table, only the first column identifies the item
      const boundary = subColumns && subColumns.length > 1 ? subColumns[1] - 12 : Infinity;
      const naming = describing.filter((c) => c.x < boundary);
      const attributes = describing.filter((c) => c.x >= boundary);

      const row = {
        poz: poz.text,
        description: (naming.length > 0 ? naming : describing)
          .map((c) => c.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
        attributes: attributes.map((c) => c.text).join(' ').trim() || undefined,
        context: chain.join(' > '),
        section,
        unit: unitCell?.text.replace(/\.$/, '') ?? '',
        price: prices[0] ? parsePrice(prices[0].text) : null,
        assembly: prices[1] ? parsePrice(prices[1].text) : null,
        page: pageNumber,
      };
      rows.push(row);
      last = row;
    }
  }

  return rows;
}

/**
 * Tesisat pages have no unit column — the unit is stated once in the heading as
 * "(Ölçü: Ad.)". Lifting it out gives every row a unit, which is what lets the
 * matcher reject a poz measured in the wrong dimension.
 */
function unitFromText(...texts) {
  for (const text of texts) {
    const match = text.match(/\(\s*ölçü\s*:?\s*([^).]{1,12}?)\s*\.?\s*\)/i);
    if (match) return match[1].trim();
  }
  return '';
}

const inputs = process.argv.slice(2).filter((arg, i, all) => {
  if (arg === '--poz') return false;
  return all[i - 1] !== '--poz';
});

for (const path of inputs) {
  const rows = await extract(path);
  for (const row of rows) {
    row.description = row.description.replace(/\s+/g, ' ').trim();
    if (!row.unit) {
      row.unit = unitFromText(row.description, row.context);
      // A unit read out of a heading describes the family, not necessarily the
      // row: "KLİMA SİSTEMİ (Ölçü:Ad.)" sits above pipe runs sold by the metre.
      // Flagged so the matcher treats it as a hint rather than a fact.
      if (row.unit) row.unitInferred = true;
    }
  }

  const output = join(dirname(path), basename(path).replace(/\.pdf$/i, '.json'));
  writeFileSync(output, JSON.stringify(rows, null, 1), 'utf8');

  const withContext = rows.filter((r) => r.context).length;
  const families = {};
  for (const row of rows) families[row.poz.slice(0, 2)] = (families[row.poz.slice(0, 2)] ?? 0) + 1;

  console.log(
    `${basename(path)} → ${basename(output)} | ${rows.length} poz | başlık zinciri olan ${withContext}`,
  );
  console.log('  aileler:', JSON.stringify(families));
}
