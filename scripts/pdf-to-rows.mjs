// Extracts birim fiyat kitabı PDFs into structured rows using text positions
// rather than a reconstructed table.
//
// These books have a fixed column layout (poz | tanım | birim | birim fiyat |
// montaj bedeli), and every group heading sits on its own line with no poz and
// no price. Reading coordinates therefore recovers exactly what a generic table
// extractor loses: prices stay attached to their row, headings stay separate
// from descriptions, and a row is never merged with its neighbour.
//
//   node scripts/pdf-to-rows.mjs data/books/new/mekanik.pdf [...]
//
// Writes <name>.json next to each input: { poz, description, context, unit,
// price, assembly, page }.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const POZ = /^\d{2}\.\d{3}\.\d+$/;
const PRICE = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$|^-?\d+,\d{2}$/;
const UNIT = /^(ad|adet|tk|m|mt|m²|m2|m³|m3|kg|ton|sa)\.?$/i;

const parsePrice = (text) => Number.parseFloat(text.replace(/\./g, '').replace(',', '.'));

/** Group text items into visual lines, tolerating sub-point baseline jitter. */
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

/**
 * Price columns are right-aligned, so their right edges cluster tightly while
 * their left edges do not. Clustering those edges finds the columns without
 * hardcoding any page geometry.
 */
function priceColumns(lines, pageWidth) {
  // The page names its own price columns ("Güncel Birim Fiyat (TL)"), and rows
  // may carry other decimals further left — a pipe table prints kg/m right next
  // to the description. Anchoring on the header keeps engineering data out.
  let leftBound = pageWidth * 0.55;
  for (const line of lines) {
    for (const cell of line.cells) {
      if (/Fiyat|Bedeli/i.test(cell.text)) leftBound = Math.min(leftBound, cell.x - 20);
    }
  }

  const edges = [];
  for (const line of lines) {
    for (const cell of line.cells) {
      if (PRICE.test(cell.text) && cell.right > leftBound) edges.push(cell.right);
    }
  }
  if (edges.length === 0) return [];

  edges.sort((a, b) => a - b);
  const clusters = [];
  for (const edge of edges) {
    const last = clusters[clusters.length - 1];
    if (last && edge - last.at(-1) < 20) last.push(edge);
    else clusters.push([edge]);
  }
  const found = clusters
    .filter((c) => c.length >= 3)
    .map((c) => ({ center: c.reduce((a, b) => a + b, 0) / c.length, count: c.length }))
    .sort((a, b) => a.center - b.center);
  if (found.length === 0) return [];

  // Price columns are the last columns on the page and sit next to each other.
  // Anything further left is data about the item (a pipe table prints kg/m),
  // never its price.
  const rightmost = found[found.length - 1].center;
  return found.filter((column) => rightmost - column.center < 100);
}

const isHeadingText = (text) => {
  // page numbers and stray marks are not headings
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters < 3) return false;
  return text.endsWith(':') || /^[^a-zçğıöşü]*$/u.test(text) || /\(\s*ölçü/i.test(text);
};

async function extract(path) {
  const document = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(path)),
    useSystemFonts: true,
  }).promise;

  const rows = [];
  let context = '';

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const lines = toLines((await page.getTextContent()).items);
    const columns = priceColumns(lines, page.getViewport({ scale: 1 }).width);
    if (columns.length === 0) continue;

    // the unit column sits immediately left of the first price column
    const unitLeft = Math.min(...columns.map((c) => c.center)) - 120;

    for (const line of lines) {
      const poz = line.cells.find((c) => POZ.test(c.text) && c.x < unitLeft);
      const prices = line.cells.filter((c) => PRICE.test(c.text) && c.right > unitLeft);
      const unitCell = line.cells.find((c) => UNIT.test(c.text) && c.x > unitLeft - 40);

      const describing = line.cells.filter(
        (c) => c !== poz && c !== unitCell && !prices.includes(c) && c.right < unitLeft + 40,
      );
      const text = describing.map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim();

      if (!poz) {
        // A line with neither poz nor price is either the heading for the rows
        // below or the tail of the previous row's description.
        if (prices.length === 0 && text) {
          if (isHeadingText(text)) context = text;
          else if (rows.length > 0) rows.at(-1).description += ` ${text}`;
        }
        continue;
      }

      // prices are assigned by which column they land in, so a missing montaj
      // bedeli never shifts the birim fiyat into the wrong field
      const byColumn = columns.map((column) => {
        const cell = prices.find((p) => Math.abs(p.right - column.center) < 25);
        return cell ? parsePrice(cell.text) : null;
      });

      rows.push({
        poz: poz.text,
        description: text,
        context,
        unit: unitCell?.text.replace(/\.$/, '') ?? '',
        price: byColumn[0] ?? null,
        assembly: byColumn.length > 1 ? byColumn[1] : null,
        page: pageNumber,
      });
    }
  }

  return rows;
}

for (const path of process.argv.slice(2)) {
  const rows = await extract(path);
  const output = join(dirname(path), basename(path).replace(/\.pdf$/i, '.json'));
  writeFileSync(output, JSON.stringify(rows, null, 1), 'utf8');

  const priced = rows.filter((r) => r.price !== null).length;
  console.log(
    `${basename(path)} → ${basename(output)} | ${rows.length} poz | fiyatlı ${priced} | ` +
      `fiyatsız ${rows.length - priced}`,
  );
}
