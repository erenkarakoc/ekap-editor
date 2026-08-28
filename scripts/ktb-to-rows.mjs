// Extracts the Kültür ve Turizm Bakanlığı / Vakıflar birim fiyat listesi.
//
// This book is flat — no poz-number hierarchy, no group headings — but its rows
// wrap in both directions: the description can start on the line *above* the
// poz and continue below it.
//
//   y=734  Özgün Elemanların ( Mihrap, Minber, Kürsü, ...) Koruma
//   y=728  V.0614                                    M²    1.915,28
//   y=722  altına alınması
//
// So description fragments are assigned to the nearest priced row by vertical
// distance rather than by reading order.
//
//   node scripts/ktb-to-rows.mjs data/books/new/kultur-ve-turizm-bakanligi-2026-birim-fiyatlari.pdf

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// V.0614 · 01.V03/1 · KTB.10.1002 · V.0401/01A · 8.1
const POZ = /^(?:[A-ZÇĞİÖŞÜ]{1,4}\.)?\d{1,4}(?:[./-][A-Za-z0-9]{1,6})*$/;
const PRICE = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;

const parsePrice = (text) => Number.parseFloat(text.replace(/\./g, '').replace(',', '.'));

function toLines(items) {
  const lines = [];
  for (const item of items) {
    const text = item.str.trim();
    if (!text) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const line = lines.find((l) => Math.abs(l.y - y) < 3);
    const cell = { x, right: x + (item.width ?? 0), text };
    if (line) line.cells.push(cell);
    else lines.push({ y, cells: [cell] });
  }
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) line.cells.sort((a, b) => a.x - b.x);
  return lines;
}

/** Column geometry from the page's own header row. */
function readHeader(lines) {
  for (const line of lines) {
    const poz = line.cells.find((c) => /^Poz\s*No$/i.test(c.text));
    if (!poz) continue;
    const near = lines.filter((l) => Math.abs(l.y - line.y) < 22).flatMap((l) => l.cells);
    const at = (pattern) => near.find((c) => pattern.test(c.text));
    return {
      description: at(/İmalat Çeşidi|Tanım/i)?.x ?? poz.right + 40,
      unit: at(/^(Ölçü|Birimi)$/i)?.x ?? null,
      price: at(/Birim Fiyat/i)?.x ?? null,
    };
  }
  return null;
}

async function extract(path) {
  const document = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(path)),
    useSystemFonts: true,
  }).promise;

  const rows = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const lines = toLines((await page.getTextContent()).items);
    const header = readHeader(lines);
    if (!header || header.price === null) continue;

    // The "Birim Fiyat" label starts left of the numbers it heads, and the unit
    // column sits between them — measuring from the label would swallow the
    // unit and leave every row unitless, disabling the matcher's unit gate.
    const priceCells = lines.flatMap((l) => l.cells).filter((c) => PRICE.test(c.text));
    const priceLeft = priceCells.length > 0 ? Math.min(...priceCells.map((c) => c.x)) - 12 : header.price;
    const entries = [];
    const fragments = [];

    for (const line of lines) {
      if (line.y > 745) continue; // running header
      const prices = line.cells.filter((c) => PRICE.test(c.text) && c.x > priceLeft);
      const poz = line.cells.find((c) => POZ.test(c.text) && c.x < header.description - 20);
      const unit =
        header.unit === null
          ? null
          : line.cells.find((c) => Math.abs(c.x - header.unit) < 40 && c.x < priceLeft);

      const describing = line.cells.filter(
        (c) => c !== poz && c !== unit && !prices.includes(c) && c.x < priceLeft,
      );
      const text = describing.map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim();

      if (poz && prices.length > 0) {
        entries.push({
          poz: poz.text,
          y: line.y,
          unit: unit?.text.replace(/\.$/, '') ?? '',
          price: parsePrice(prices[0].text),
          assembly: prices[1] ? parsePrice(prices[1].text) : null,
          parts: text ? [{ y: line.y, text }] : [],
          page: pageNumber,
        });
      } else if (text) {
        fragments.push({ y: line.y, text });
      }
    }

    // each loose fragment belongs to whichever priced row it sits closest to
    for (const fragment of fragments) {
      let nearest = null;
      for (const entry of entries) {
        const distance = Math.abs(entry.y - fragment.y);
        if (!nearest || distance < nearest.distance) nearest = { entry, distance };
      }
      if (nearest && nearest.distance < 40) nearest.entry.parts.push(fragment);
    }

    for (const entry of entries) {
      entry.parts.sort((a, b) => b.y - a.y);
      rows.push({
        poz: entry.poz,
        description: entry.parts.map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim(),
        context: '',
        unit: entry.unit,
        price: entry.price,
        assembly: entry.assembly,
        page: entry.page,
      });
    }
  }

  return rows;
}

for (const path of process.argv.slice(2)) {
  const rows = (await extract(path)).filter((r) => r.description.length > 3);
  const output = join(dirname(path), basename(path).replace(/\.pdf$/i, '.json'));
  writeFileSync(output, JSON.stringify(rows, null, 1), 'utf8');

  const prefixes = {};
  for (const row of rows) {
    const key = row.poz.split(/[.\/-]/)[0];
    prefixes[key] = (prefixes[key] ?? 0) + 1;
  }
  console.log(`${basename(path)} → ${basename(output)} | ${rows.length} poz`);
  console.log('  önekler:', JSON.stringify(Object.fromEntries(Object.entries(prefixes).sort((a, b) => b[1] - a[1]).slice(0, 8))));
}
