// Fills the "Teklif Edilen Birim Fiyat" column of a birim fiyat teklif cetveli
// by matching each row's description against birim fiyat kitabı markdown files
// produced by scripts/pdf-to-md.mjs.
//
// The cetvel has no poz numbers, so matching is description-only: idf-weighted
// token overlap plus phrase overlap. Text similarity alone is not enough to
// price construction work, so a candidate must also survive three gates that
// encode what the item physically is:
//
//   1. unit dimension — an "Ad" poz can never price a "metre" line item, and
//      "100 m²" / "Ton" prices are converted, not taken at face value
//   2. spec numbers   — capacities and sizes must agree at least once, with
//      TS/EN standard codes excluded from the comparison
//   3. shared wording — agreeing only on digits is not agreement at all
//
// Without them a "L=180 ANKRAJ" özel poz matched a 180 m³ water tank and put
// 819 million TL on one line.
//
//   node scripts/match-teklif.mjs data/books/new/2026-1268390.xlsx data/books/new/*.md

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import * as XLSX from 'xlsx';

// Poz matching and pricing are deliberately separable: the merged book is the
// best source for *which* poz a line item is, while the per-book PDFs carry the
// current (TÜİK-indexed) prices for the same poz numbers.
//
//   node scripts/match-teklif.mjs cetvel.xlsx kitap.json --prices mekanik.json ...
const argv = process.argv.slice(2);
const split = argv.indexOf('--prices');
const [xlsxPath, ...bookPaths] = split === -1 ? argv : argv.slice(0, split);
const pricePaths = split === -1 ? [] : argv.slice(split + 1);

if (!xlsxPath || bookPaths.length === 0) {
  console.error(
    'usage: node scripts/match-teklif.mjs <cetvel.xlsx> <kitap.json|md> [...] [--prices <kaynak.json> ...]',
  );
  process.exit(1);
}

// ---------------------------------------------------------------- normalizing

// Procedural boilerplate: the cetvel spells out the work ("...Temini ve Betona
// Karıştırılması") where a rayiç row names only the material. These words say
// nothing about *which* item it is, but "karıştırılması" is rare enough that
// leaving it in would sink an otherwise perfect material match.
const STOPWORDS = new Set([
  've', 'ile', 'için', 'veya', 'bu', 'da', 'de', 'ya',
  'temini', 'temin', 'edilmesi', 'yapılması', 'konulması', 'konulmasi',
  'montajı', 'montajının', 'işyerinde', 'yerine', 'uygulanması', 'karıştırılması',
]);

/** Lowercase Turkish-aware, keep decimal numbers glued, strip punctuation. */
function normalize(text) {
  return String(text)
    .replace(/\r?\n/g, ' ')
    .toLocaleLowerCase('tr')
    // Turkish writes thousands with a dot and decimals with a comma. "6.000 W"
    // and "6000 W" are the same rating, so the separator has to go — but the
    // lookahead keeps poz numbers like 35.100.1101 intact.
    .replace(/\b\d{1,3}(?:\.\d{3})+\b(?!\.\d)/g, (match) => match.replace(/\./g, ''))
    .replace(/(\d),(\d)/g, '$1_$2')
    // the cetvel writes "1x185", the books write "1 x 185"
    .replace(/(\d)\s*[x×]\s*(\d)/g, '$1 x $2')
    // ...and the books glue the unit on: "250V.a kadar" vs "250 V'a kadar"
    .replace(/(\d)(\p{L})/gu, '$1 $2')
    .replace(/[^\p{L}\p{N}_]+/gu, ' ')
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .split(' ')
    // single digits are kept: "2 cm" vs "4 cm" is the whole difference between
    // two otherwise identical poz numbers
    .filter((t) => (t.length > 1 || /\d/.test(t)) && !STOPWORDS.has(t));
}

const isNumeric = (token) => /\d/.test(token);

/**
 * Turkish glues suffixes onto words, so the cetvel writes "polipropilenden" and
 * "liflerinin" where the book writes "polipropilen" and "lifleri" — the same
 * words, contributing nothing to an exact-token score. Truncating longer words
 * to a common stem lets them match.
 */
const SUFFIXES = [
  'larının', 'lerinin', 'ların', 'lerin', 'ları', 'leri', 'lar', 'ler',
  'sının', 'sinin', 'nın', 'nin', 'nun', 'nün', 'ın', 'in', 'un', 'ün',
  'dan', 'den', 'tan', 'ten', 'da', 'de', 'ta', 'te',
  'sı', 'si', 'su', 'sü', 'lı', 'li', 'lu', 'lü', 'ya', 'ye', 'na', 'ne',
  'ı', 'i', 'u', 'ü', 'a', 'e',
];

/**
 * Strips at most two Turkish suffixes, never below four letters: "borular" ->
 * "boru", "polipropilenden" -> "polipropilen", "liflerinin" -> "lif". Truncating
 * to a fixed length would leave "boru" and "borular" apart, which is exactly the
 * pair that decides a pipe row.
 */
function stem(token) {
  if (isNumeric(token)) return token;
  let root = token;
  for (let pass = 0; pass < 2; pass++) {
    const suffix = SUFFIXES.find((s) => root.endsWith(s) && root.length - s.length >= 4);
    if (!suffix) break;
    root = root.slice(0, -suffix.length);
  }
  return root;
}

// Stems earn partial credit: "montajlı" and "montajsız" share one, so a stem
// hit must never count as much as the whole word agreeing.
const STEM_CREDIT = 0.5;

/** Each token, plus its stem at reduced weight when the two differ. */
function expand(tokens) {
  const expanded = new Map();
  for (const token of tokens) {
    expanded.set(token, 1);
    const root = stem(token);
    if (root !== token && !expanded.has(root)) expanded.set(root, STEM_CREDIT);
  }
  return expanded;
}

// "TS EN 60947-4-1" is a standard reference, not a capacity. Counting it as a
// spec makes a 15 kVAr contactor look like a 1000 A one.
const STANDARD_PREFIXES = new Set(['ts', 'en', 'tse', 'iso', 'din', 'vde', 'iec']);

/**
 * The numbers that describe the physical item: capacities, sections, sizes.
 * Standard-code digits are dropped, including the trailing parts of a code.
 */
function specNumbers(tokens) {
  const numbers = new Set();
  let inStandardCode = false;
  for (const token of tokens) {
    if (STANDARD_PREFIXES.has(token)) {
      inStandardCode = true;
      continue;
    }
    if (!isNumeric(token)) {
      inStandardCode = false;
      continue;
    }
    if (!inStandardCode) numbers.add(token);
  }
  return numbers;
}

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * "2.444,70" -> 2444.7. Deliberately strict: the two-decimal comma is what
 * separates a price cell from a description like "16x31 cm".
 */
function parsePrice(text) {
  const value = String(text).trim();
  if (!/^-?\d{1,3}(?:\.\d{3})*,\d{2}$/.test(value) && !/^-?\d+,\d{2}$/.test(value)) return null;
  const parsed = Number.parseFloat(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

// Cetvel uses long unit names, the books use abbreviations. Each unit maps to a
// dimension plus how many base units it represents, so "Ton" against a
// kilogram row and "100 m²" against a metrekare row are converted rather than
// silently taken at face value — that is where absurd prices came from.
const UNIT_TABLE = {
  ad: ['count', 1, 'adet'],
  adet: ['count', 1, 'adet'],
  tk: ['count', 1, 'takım'],
  tak: ['count', 1, 'takım'],
  takım: ['count', 1, 'takım'],
  m: ['length', 1],
  mt: ['length', 1],
  metre: ['length', 1],
  'm²': ['area', 1],
  m2: ['area', 1],
  metrekare: ['area', 1],
  'm³': ['volume', 1],
  m3: ['volume', 1],
  metreküp: ['volume', 1],
  kg: ['mass', 1],
  kilogram: ['mass', 1],
  ton: ['mass', 1000],
  sa: ['time', 1],
  saat: ['time', 1],
};

/** "100 m²" -> { dimension: 'area', size: 100 }; unknown text -> null. */
function parseUnit(raw) {
  const text = normalize(raw).replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const multiplier = text.match(/^(\d+)\s+(.+)$/);
  const size = multiplier ? Number(multiplier[1]) : 1;
  const name = (multiplier ? multiplier[2] : text).replace(/\s+/g, '');

  const entry = UNIT_TABLE[name];
  if (!entry) return null;
  return { dimension: entry[0], size: size * entry[1], kind: entry[2] ?? entry[0] };
}

/**
 * How to reconcile a book row's unit with the cetvel's. Returns null when the
 * two measure different things — a "metre" line item can never be priced from
 * an "Ad" poz, no matter how similar the descriptions read.
 */
function unitConversion(cetvelUnit, bookUnit, inferred) {
  const cetvel = parseUnit(cetvelUnit);
  const book = parseUnit(bookUnit);
  if (!cetvel || !book) return { scale: 1, factor: 0.97 };
  if (cetvel.dimension !== book.dimension) {
    // an inherited unit is a hint, not grounds for rejecting the poz
    return inferred ? { scale: 1, factor: 0.8 } : null;
  }

  return {
    // book price is per `book.size` base units, the cetvel wants `cetvel.size`
    scale: cetvel.size / book.size,
    factor: cetvel.kind === book.kind ? 1 : 0.92,
  };
}

// ------------------------------------------------------------- book md parser

/**
 * Group headings ("Derinlik en az 500 mm:") sit between table rows in the PDF.
 * pdf-inspector emits them either as a row with an empty poz cell, or glued to
 * the end of the previous row's description. Both forms are recovered here so
 * the heading can be used as matching context for the rows that follow it.
 */
const hasLowercase = (word) => /\p{Ll}/u.test(word);
const isCapsWord = (word) => (word.match(/\p{Lu}/gu) ?? []).length >= 3 && !hasLowercase(word);

// A heading that introduces the next family says what the family *is*.
const FAMILY_HINT = /\(\s*ölçü\s*:|\btipi\b|performansı/i;
const SPEC_UNITS = new Set(['mm', 'mm2', 'mm²', 'cm', 'm', 'ø', 'kv', 'v', 'ts', 'en', 'kesitinde']);

const isSpecWord = (word) => {
  const clean = word.replace(/[^\p{L}\p{N}²]/gu, '');
  if (!clean) return true;
  if (SPEC_UNITS.has(clean.toLocaleLowerCase('tr'))) return true;
  // a type code such as "N2XH" or "H07Z" has digits but starts the heading
  const letters = clean.match(/\p{L}/gu) ?? [];
  if (/^\p{Lu}/u.test(clean) && letters.length >= 2) return false;
  return /\d/.test(clean);
};

/**
 * "(Ölçü: Ad.)" closes a heading in these books, so when several headings have
 * been concatenated the one introducing the rows below is the last segment:
 * "KOLYE PRİZ (Ölçü: Ad.) … SU DEPOLARI: (Ölçü: Ad.) Prizmatik Modüler
 * Paslanmaz Çelik Su Deposu :(Ölçü: Ad.)" -> "Prizmatik Modüler Paslanmaz
 * Çelik Su Deposu :".
 */
function lastHeadingSegment(text) {
  const parts = text
    .split(/\(\s*ölçü\s*:[^)]*\)/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : text;
}

function splitTrailingHeading(description) {
  const colon = description.match(/^(.*?[.)])\s+([^.]{4,}?:)\s*$/);
  if (colon) return { description: colon[1].trim(), heading: colon[2].trim() };

  // Cable and conduit rows are "<kesit> <FAMILY HEADING>": the row itself is
  // only a cross-section, and the type that follows belongs to the rows below.
  const words = description.split(/\s+/);
  let spec = 0;
  while (spec < words.length && isSpecWord(words[spec])) spec++;
  if (spec > 0 && spec < words.length && words.slice(0, spec).some((w) => /\d/.test(w))) {
    const head = words[spec];
    const rest = words.slice(spec).join(' ').trim();
    if (head.length >= 3 && /^\p{Lu}/u.test(head) && rest.length >= 20 && FAMILY_HINT.test(rest)) {
      return { description: words.slice(0, spec).join(' ').trim(), heading: rest };
    }
  }

  // A run of two or more all-caps words starts the next section's heading
  // ("... Alafranga Tuvalet Seti ANTİBAKTERİYEL KLOZET VE TESİSATI").
  for (let i = 1; i < words.length - 1; i++) {
    if (!isCapsWord(words[i]) || !isCapsWord(words[i + 1])) continue;
    if (!words.slice(0, i).some(hasLowercase)) break;
    return {
      description: words.slice(0, i).join(' ').trim(),
      heading: words.slice(i).join(' ').trim(),
    };
  }

  return { description, heading: null };
}

/**
 * Row shape varies between and within books: 4 columns (poz, tanım, birim,
 * fiyat), 5 columns (+ montaj bedeli), and in mekanik.md up to 7 where the
 * group heading and description continuations occupy their own columns. So the
 * row is read right-anchored: trailing price cells first, then the unit, and
 * whatever is left between the poz and the unit is description + headings.
 */
function readRow(cells) {
  let end = cells.length;
  // rows often end with an empty montaj bedeli cell
  while (end > 2 && cells[end - 1] === '') end--;

  const prices = [];
  while (end > 2 && prices.length < 2) {
    const price = parsePrice(cells[end - 1]);
    if (price === null) break;
    prices.unshift(price);
    end--;
  }
  // No price on the row is not a reason to drop it: the values may live in a
  // detached block that attachOrphanPrices() puts back.
  const unit = cells[end - 1] ?? '';
  const middle = cells.slice(1, end - 1).filter(Boolean);

  return {
    // an empty description means the row is identified purely by its heading
    description: middle[0] ?? '',
    // later non-empty cells are the group heading for the rows that follow
    heading: middle.slice(1).join(' ').trim(),
    unit,
    price: prices.length > 0 ? prices[0] : null,
    assembly: prices.length > 1 ? prices[1] : null,
  };
}

/**
 * On some mekanik pages pdf-inspector lifts the two price columns out of the
 * table and emits them as a single cell of space-separated values:
 *
 *   |Güncel Birim Fiyat (TL)||
 *   ||84.020,29 98.992,33 121.805,55 ... |
 *   |25.150.1303|3,75 m3|Ad|||          <- 24 rows, all prices missing
 *
 * The values stay in poz order, so a block can be reattached to a run of
 * price-less rows — but only when the counts match exactly. Anything else is
 * left unpriced rather than guessed at.
 */
function bulkPrices(cell) {
  const parts = cell.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const values = parts.map(parsePrice);
  return values.every((v) => v !== null) ? values : null;
}

function attachOrphanPrices(events) {
  const isFree = (event, kind) => event.type === 'block' && event.kind === kind && !event.used;

  const findBlock = (start, end, length, kind) => {
    for (let distance = 1; distance <= 6; distance++) {
      const before = events[start - distance];
      if (before && isFree(before, kind) && before.values.length === length) return before;
      const after = events[end + distance];
      if (after && isFree(after, kind) && after.values.length === length) return after;
    }
    return null;
  };

  let attached = 0;
  for (let i = 0; i < events.length; i++) {
    if (events[i].type !== 'row' || events[i].row.price !== null) continue;

    let end = i;
    const run = [];
    while (end < events.length && events[end].type === 'row' && events[end].row.price === null) {
      run.push(events[end].row);
      end++;
    }
    end--;

    const priceBlock = findBlock(i, end, run.length, 'price');
    if (priceBlock) {
      priceBlock.used = true;
      const assemblyBlock = findBlock(i, end, run.length, 'assembly');
      if (assemblyBlock) assemblyBlock.used = true;

      run.forEach((row, index) => {
        row.price = priceBlock.values[index];
        if (assemblyBlock) row.assembly = assemblyBlock.values[index];
        row.recovered = true;
      });
      attached += run.length;
    }
    i = end;
  }
  return attached;
}

let recoveredRows = 0;

/**
 * Rows produced by scripts/pdf-to-rows.mjs, which reads the PDF by text
 * position. Nothing needs repairing here — prices, units and group headings
 * arrive already separated.
 */
function parseBookJson(path) {
  const source = basename(path).replace(/\.json$/i, '');
  return JSON.parse(readFileSync(path, 'utf8')).map((row) => ({
    poz: row.poz,
    description: row.description ?? '',
    context: row.context ?? '',
    unit: row.unit ?? '',
    unitInferred: row.unitInferred === true,
    price: row.price ?? null,
    assembly: row.assembly ?? null,
    source,
  }));
}

function parseBook(path) {
  if (/\.json$/i.test(path)) return parseBookJson(path);

  const source = basename(path).replace(/\.md$/i, '');
  const rows = [];
  const events = [];
  let section = '';
  let heading = '';
  let blockKind = 'price';

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.startsWith('|')) {
      // Group headings are frequently emitted outside the table, as markdown
      // headings or a fully bold line ("## Prizmatik Modüler Galvanizli Su
      // Deposu (Ölçü: Ad.)"). They name the product that the rows below only
      // qualify by size, so they are the matching context for those rows.
      const outside = line.match(/^#{1,6}\s+(.+)$/) ?? line.match(/^\*\*(.+)\*\*\s*$/);
      if (outside) {
        const text = outside[1].replace(/<\/?u>|\*\*/g, '').trim();
        if (text) {
          section = text;
          heading = '';
        }
        continue;
      }

      // On a few mekanik pages pdf-inspector fails to rebuild the table and
      // emits the rows as prose, losing the price columns entirely. Those poz
      // numbers are still indexed — without a price — so a cetvel row that
      // belongs to them is reported as a gap instead of matching something else.
      const prose = line.match(/^(\d{2}\.\d{3}\.\d+)\s+(.+)$/);
      if (!prose) continue;

      const bold = [...prose[2].matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1].trim());
      const text = prose[2].replace(/\*\*(.+?)\*\*/g, ' ').replace(/\s+/g, ' ').trim();
      if (!text && bold.length === 0) continue;

      rows.push({
        poz: prose[1],
        description: text,
        context: `${section} ${heading}`.trim(),
        unit: '',
        price: null,
        assembly: null,
        source,
      });
      if (bold.length > 0) heading = bold.join(' ');
      continue;
    }
    if (line.startsWith('|---')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());

    // the column header that says which price the next detached block holds
    for (const cell of cells) {
      if (/montaj bedeli/i.test(cell)) blockKind = 'assembly';
      else if (/birim fiyat/i.test(cell)) blockKind = 'price';
    }

    let detached = null;
    for (const cell of cells) {
      const values = bulkPrices(cell);
      if (values) detached = values;
    }
    if (detached) {
      events.push({ type: 'block', kind: blockKind, values: detached, used: false });
      continue;
    }

    if (cells.length < 4) continue;

    const poz = cells[0];
    if (!/^\d{2}\.\d{3}\.\d+$/.test(poz.trim())) {
      const text = cells.slice(1).filter(Boolean).join(' ').trim();
      if (!text || parsePrice(text)) continue;

      if (!poz) {
        // standalone heading row: no poz, but text in the description column
        section = text;
        heading = '';
      } else if (/^\d{2}\.\d{3}\.\d+/.test(poz)) {
        // Two poz numbers collapsed into one row ("25.145.1001 25.145.1002").
        // The row itself is unusable, but it carries the heading for the rows
        // below it — losing it strands a whole family with no product name.
        // Only the description cell: the merged unit and price cells are noise.
        const description = readRow(cells).description;
        if (description) heading = lastHeadingSegment(description);
      }
      continue;
    }

    const parsed = readRow(cells);
    if (!parsed) continue;

    const split = splitTrailingHeading(parsed.description);

    const row = {
      poz,
      description: split.description,
      context: `${section} ${heading}`.trim(),
      unit: parsed.unit,
      price: parsed.price,
      assembly: parsed.assembly,
      source,
    };
    rows.push(row);
    events.push({ type: 'row', row });

    // a heading seen on this row describes the rows below it
    const next = parsed.heading || split.heading;
    if (next) heading = next;
  }

  recoveredRows += attachOrphanPrices(events);
  return rows;
}

// Books are ranked in the order given on the command line: the first is the
// one the tender is written against. It matters on ties — ÇŞB and Vakıflar both
// carry "Ahşaptan düz yüzeyli beton ve betonarme kalıbı yapılması" word for
// word, and the job's own book should win that.
const book = bookPaths.flatMap((path, rank) =>
  parseBook(path).map((row) => ({ ...row, rank })),
);
if (book.length === 0) {
  console.error('no poz rows parsed from the given markdown files');
  process.exit(1);
}

// Prices keyed by poz, taken from a different (usually newer) edition of the
// same books. Matching never uses these — only the final price does.
const priceIndex = new Map();
for (const path of pricePaths) {
  const source = basename(path).replace(/\.(json|md)$/i, '');
  for (const row of parseBook(path)) {
    if (row.price === null || priceIndex.has(row.poz)) continue;
    priceIndex.set(row.poz, { price: row.price, assembly: row.assembly, source });
  }
}

// --------------------------------------------------------- index + idf weights

const documentFrequency = new Map();
for (const row of book) {
  row.tokens = tokenize(row.description);
  row.contextTokens = tokenize(row.context).filter((t) => !row.tokens.includes(t));
  for (const token of expand([...row.tokens, ...row.contextTokens]).keys()) {
    documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
}

/** Consecutive token pairs, so word order counts ("alafranga tuvalet"). */
function bigrams(...tokenLists) {
  const pairs = new Set();
  for (const tokens of tokenLists) {
    for (let i = 0; i < tokens.length - 1; i++) pairs.add(`${tokens[i]}~${tokens[i + 1]}`);
  }
  return pairs;
}

// Dimensions and capacities ("800", "0_60", "60x120") are what separate poz
// numbers inside the same family, so they weigh more than ordinary words.
const NUMERIC_BOOST = 1.6;

const idf = (token) => Math.log(book.length / (1 + (documentFrequency.get(token) ?? 0))) + 1;

// Only real specs are boosted. "TS EN 14889-2" is an identifier, not a size, so
// boosting it lets a standard reference outweigh the product name itself.
const weigh = (token, specs) => idf(token) * (specs.has(token) ? NUMERIC_BOOST : 1);

const postings = new Map();
book.forEach((row, id) => {
  row.weights = new Map();
  row.numbers = specNumbers([...row.tokens, ...row.contextTokens]);
  for (const [token, credit] of expand(row.tokens)) {
    row.weights.set(token, weigh(token, row.numbers) * credit);
  }
  // Heading context counts less than the description itself — except where the
  // description is a bare qualifier ("Paslanmaz Çelik:", "Takriben 16x16 cm.")
  // and the heading carries the actual product name.
  const contextWeight = row.tokens.length < 5 ? 1 : 0.6;
  for (const [token, credit] of expand(row.contextTokens)) {
    if (row.weights.has(token)) continue;
    row.weights.set(token, weigh(token, row.numbers) * credit * contextWeight);
  }
  row.totalWeight = [...row.weights.values()].reduce((a, b) => a + b, 0);
  row.textTotal = [...row.weights.entries()]
    .filter(([token]) => !isNumeric(token))
    .reduce((sum, [, weight]) => sum + weight, 0);
  row.bigrams = bigrams(row.tokens, row.contextTokens);

  for (const token of row.weights.keys()) {
    if (!postings.has(token)) postings.set(token, []);
    postings.get(token).push(id);
  }
});

// ------------------------------------------------------------------- matching

const MAX_CANDIDATES = 6000;

// Below this a "match" is noise, and reporting it invites someone to accept a
// price for work the books never priced (özel poz). Nothing is better.
const NO_MATCH_FLOOR = 0.2;

// Share of the cetvel's non-numeric weight that must be covered before two rows
// can be considered the same work item at all.
const MIN_TEXT_OVERLAP = 0.2;

// How good a match from a higher-priority book has to be before later books are
// consulted at all.
const BOOK_FALLBACK_FLOOR = 0.45;

function score(query, row) {
  // A poz measured in a different dimension cannot price this line item.
  const conversion = unitConversion(query.unit, row.unit, row.unitInferred);
  if (!conversion) return null;

  let shared = 0;
  let sharedText = 0;
  for (const [token, weight] of query.weights) {
    if (!row.weights.has(token)) continue;
    const overlap = Math.min(weight, row.weights.get(token));
    shared += overlap;
    if (!isNumeric(token)) sharedText += overlap;
  }
  if (shared === 0) return null;

  // Agreeing only on numbers is not agreement: "L=180 ANKRAJ" and "180 m3" (a
  // water tank) share nothing that makes them the same physical work item.
  // Measured against the shorter side, because a book row is often just a size
  // ("2\"") whose naming words all live in its heading.
  const shorter = Math.min(query.textTotal, row.textTotal || query.textTotal);
  if (sharedText < MIN_TEXT_OVERLAP * shorter) return null;

  const { queryTotal, queryBigrams, queryNumbers } = query;

  // Geometric mean, so a short book row that happens to share one token with a
  // long cetvel description cannot win on its own high coverage alone: both
  // directions have to agree.
  const coverageQuery = shared / queryTotal;
  const coverageCandidate = shared / row.totalWeight;
  const unigram = Math.sqrt(coverageQuery * coverageCandidate);

  // Overlap coefficient rather than dice: the cetvel description is regularly a
  // superset of the book row, and a shared phrase should still count fully.
  let sharedPairs = 0;
  for (const pair of queryBigrams) if (row.bigrams.has(pair)) sharedPairs++;
  const smaller = Math.min(queryBigrams.size, row.bigrams.size);
  const phrase = smaller > 0 ? sharedPairs / smaller : 0;

  let value = (0.65 * unigram + 0.35 * phrase) * conversion.factor;

  // Within a family the rows differ only by a dimension ("1x185" vs "4x10").
  // Only judge when the book row states specs of its own — a row that carries
  // none is simply terse, not contradictory.
  if (queryNumbers.size > 0 && row.numbers.size > 0) {
    let hits = 0;
    for (const number of queryNumbers) if (row.numbers.has(number)) hits++;
    // Both sides state physical specs and none agree: a 15 kVAr contactor and a
    // 1000 A one are not the same item however alike the words read.
    if (hits === 0) return null;
    value *= 0.55 + 0.45 * (hits / queryNumbers.size);
  }

  return { value, scale: conversion.scale };
}

function findMatches(description, unit) {
  const tokens = tokenize(description);
  if (tokens.length === 0) return [];

  const specs = specNumbers(tokens);
  const weights = new Map();
  for (const [token, credit] of expand(tokens)) weights.set(token, weigh(token, specs) * credit);

  const query = {
    unit,
    weights,
    queryTotal: [...weights.values()].reduce((a, b) => a + b, 0),
    textTotal: [...weights.entries()]
      .filter(([token]) => !isNumeric(token))
      .reduce((sum, [, weight]) => sum + weight, 0),
    queryBigrams: bigrams(tokens),
    queryNumbers: specs,
  };
  if (query.textTotal === 0) return [];

  // rarest tokens first, so the candidate pool stays small and relevant
  const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const candidates = new Set();
  for (const token of ranked) {
    for (const id of postings.get(token) ?? []) candidates.add(id);
    if (candidates.size > MAX_CANDIDATES) break;
  }

  const scored = [];
  for (const id of candidates) {
    const result = score(query, book[id]);
    if (result && result.value >= NO_MATCH_FLOOR) {
      scored.push({ row: book[id], score: result.value, scale: result.scale });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  // Books are consulted in the order given: a later book is a fallback, not a
  // rival. Otherwise Vakıflar wins rows that ÇŞB carries word for word, purely
  // because its entries have no heading chain diluting their score.
  for (let rank = 0; rank < bookPaths.length; rank++) {
    const fromBook = scored.filter((m) => m.row.rank === rank);
    if (fromBook.length > 0 && fromBook[0].score >= BOOK_FALLBACK_FLOOR) {
      return fromBook.slice(0, 3);
    }
  }
  return scored.slice(0, 3);
}

// ----------------------------------------------------------------- read cetvel

const workbook = XLSX.read(readFileSync(xlsxPath), { type: 'buffer', cellStyles: true });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

const HEADERS = [
  'Eşleşen Poz No',
  'Kitap Açıklaması',
  'Kitap Birimi',
  'Kitap Birim Fiyat',
  'Kitap Montaj Bedeli',
  'Güven',
  'Kaynak Kitap',
  '2. Aday',
];

const range = XLSX.utils.decode_range(sheet['!ref']);
HEADERS.forEach((header, i) => {
  const address = XLSX.utils.encode_cell({ r: 0, c: 7 + i });
  sheet[address] = { t: 's', v: header };
});
range.e.c = Math.max(range.e.c, 7 + HEADERS.length - 1);
sheet['!ref'] = XLSX.utils.encode_range(range);
sheet['!cols'] = [
  ...(sheet['!cols'] ?? []),
  { wch: 14 }, { wch: 50 }, { wch: 10 }, { wch: 14 },
  { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 26 },
];

// Below this the match is not trustworthy enough to put a price into a tender,
// so column F is left empty — the candidate still goes into the audit columns.
// Set from the data: the 55-69 band is dominated by correct matches that only
// score low because the cetvel spells out what the book states as a heading,
// while below ~40 real errors appear (a 40 mm pipe matching a 25 mm poz).
const MIN_CONFIDENCE = 0;

const stats = { high: 0, medium: 0, low: 0, missing: 0, none: 0, blank: 0 };
const report = [];

let grandTotal = 0;
let firstDataRow = null;
let lastDataRow = null;
let totalRow = null;

for (let r = 1; r < grid.length; r++) {
  const row = grid[r];
  const siraNo = String(row[0] ?? '').trim();
  const description = String(row[2] ?? '').trim();
  if (siraNo.startsWith('TOPLAM')) {
    totalRow = r;
    continue;
  }
  if (!siraNo || !description) continue;

  const unit = String(row[3] ?? '').trim();
  const matches = findMatches(description, unit);
  const best = matches[0];
  const confidence = best ? Math.round(best.score * 100) : 0;

  const write = (col, cell) => {
    sheet[XLSX.utils.encode_cell({ r, c: col })] = cell;
  };

  // The poz comes from the matched book, the price from the price sources when
  // they carry that poz. Families the price sources do not cover (10.x rayiç)
  // fall back to the matched book's own price — a different edition, so the
  // source column names it rather than letting it pass as current.
  const current = best ? priceIndex.get(best.row.poz) : null;
  const priced = current ?? best?.row ?? null;
  const filled = Boolean(best) && priced.price !== null && confidence >= MIN_CONFIDENCE;

  // prices converted into the cetvel's unit ("100 m²" poz -> per m²)
  const convert = (value) => (best && value !== null ? round2(value * best.scale) : null);
  const bookPrice = convert(priced?.price ?? null);
  const bookAssembly = convert(priced?.assembly ?? null);

  if (best) {
    if (filled) {
      write(5, { t: 'n', v: bookPrice, z: '#,##0.00' });
    }
    write(7, { t: 's', v: best.row.poz });
    write(8, { t: 's', v: best.row.description });
    write(9, { t: 's', v: best.row.unit });
    if (bookPrice !== null) write(10, { t: 'n', v: bookPrice, z: '#,##0.00' });
    if (bookAssembly !== null) write(11, { t: 'n', v: bookAssembly, z: '#,##0.00' });
    write(12, { t: 'n', v: confidence, z: '0' });
    write(13, {
      t: 's',
      v:
        priced.price === null
          ? `${best.row.source} — FİYAT BULUNAMADI`
          : [
              // no current price for this poz — flagged, not silently mixed in
              current ? current.source : `${best.row.source} — GÜNCEL FİYAT YOK`,
              best.scale === 1 ? '' : `(${best.row.unit} → ${unit})`,
            ]
              .filter(Boolean)
              .join(' '),
    });
    if (matches[1]) {
      write(14, { t: 's', v: `${matches[1].row.poz} (${Math.round(matches[1].score * 100)})` });
    }
  } else {
    write(12, { t: 'n', v: 0, z: '0' });
  }

  // Tutarı = Miktarı × Teklif Edilen Birim Fiyat, as a live formula so the rows
  // left blank start calculating as soon as a price is typed in by hand.
  const excelRow = r + 1;
  if (firstDataRow === null) firstDataRow = excelRow;
  lastDataRow = excelRow;

  const quantity = sheet[XLSX.utils.encode_cell({ r, c: 4 })]?.v;
  const formula = `IF(F${excelRow}="","",E${excelRow}*F${excelRow})`;

  if (filled && typeof quantity === 'number') {
    // cached value only — Excel recalculates the formula on open
    const amount = round2(quantity * bookPrice);
    grandTotal += amount;
    write(6, { t: 'n', v: amount, z: '#,##0.00', f: formula });
  } else {
    write(6, { t: 's', v: '', f: formula });
  }

  const band = !best
    ? 'none'
    : priced.price === null
      ? 'missing'
      : confidence >= 80
        ? 'high'
        : confidence >= 55
          ? 'medium'
          : 'low';
  stats[band]++;
  if (!filled) stats.blank++;
  report.push({ siraNo, description, unit, confidence, band, filled, matches });
}

// The "TOPLAM TUTAR (KDV Hariç)" label is merged across A:F, so the sum lands
// in G on the same row.
if (totalRow !== null && firstDataRow !== null) {
  sheet[XLSX.utils.encode_cell({ r: totalRow, c: 6 })] = {
    t: 'n',
    v: round2(grandTotal),
    z: '#,##0.00',
    f: `SUM(G${firstDataRow}:G${lastDataRow})`,
  };
}

// ------------------------------------------------------------------- write out

let outputXlsx = join(dirname(xlsxPath), basename(xlsxPath).replace(/\.xlsx$/i, '-dolu.xlsx'));
try {
  XLSX.writeFile(workbook, outputXlsx);
} catch (error) {
  if (error.code !== 'EBUSY' && error.code !== 'EPERM') throw error;
  // the previous output is open in Excel
  const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  outputXlsx = outputXlsx.replace(/\.xlsx$/i, `-${stamp}.xlsx`);
  XLSX.writeFile(workbook, outputXlsx);
  console.warn('! önceki dosya Excel’de açık, yeni dosyaya yazıldı\n');
}

const lines = [];
lines.push(`# Eşleştirme raporu — ${basename(xlsxPath)}`);
lines.push('');
lines.push(`Kitaplar: ${bookPaths.map((p) => basename(p)).join(', ')} (${book.length} poz)`);
lines.push('');
lines.push(`| Güven | Satır |`);
lines.push('|---|---|');
lines.push(`| Yüksek (≥80) | ${stats.high} |`);
lines.push(`| Orta (55–79) | ${stats.medium} |`);
lines.push(`| Düşük (<55) | ${stats.low} |`);
lines.push(`| Kitapta fiyat çıkarılamadı | ${stats.missing} |`);
lines.push(`| Eşleşme yok | ${stats.none} |`);
lines.push('');
lines.push(
  `**F sütunu ${report.length - stats.blank} satırda dolduruldu.** Güveni ${MIN_CONFIDENCE}'in ` +
    `altında kalan ${stats.blank} satır boş bırakıldı; bulunan aday yine de denetim ` +
    'sütunlarında duruyor, kontrol edip elle girebilirsiniz.',
);
lines.push('');
lines.push('## Kitapta fiyatı çıkarılamayan satırlar');
lines.push('');
lines.push(
  'Bu poz numaraları kitapta var, ancak pdf-inspector o sayfalarda tablo yapısını',
);
lines.push('kuramadığı için fiyat sütunları çıkarılamadı. Elle girilmeli.');
lines.push('');
lines.push('| Sıra | Cetvel açıklaması | Birim | Poz | Kitap açıklaması |');
lines.push('|---|---|---|---|---|');

const cell = (value) => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');

for (const item of report.filter((i) => i.band === 'missing')) {
  const best = item.matches[0];
  lines.push(
    `| ${item.siraNo} | ${cell(item.description).slice(0, 90)} | ${cell(item.unit)} | ${
      best.row.poz
    } | ${cell(best.row.description).slice(0, 90)} |`,
  );
}

const price = (match) =>
  match?.row.price == null
    ? '—'
    : round2(match.row.price * match.scale).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const detailRow = (item) => {
  const best = item.matches[0];
  const second = item.matches[1];
  return `| ${item.siraNo} | ${cell(item.description).slice(0, 90)} | ${cell(item.unit)} | ${
    best ? best.row.poz : '—'
  } | ${best ? cell(best.row.description).slice(0, 90) : '—'} | ${price(best)} | ${
    item.confidence
  } | ${second ? `${second.row.poz} (${Math.round(second.score * 100)})` : '—'} |`;
};

const DETAIL_HEADER = [
  '| Sıra | Cetvel açıklaması | Birim | Poz | Kitap açıklaması | Aday fiyat | Güven | 2. aday |',
  '|---|---|---|---|---|---|---|---|',
];

lines.push('');
lines.push(`## F sütunu boş bırakılanlar (güven < ${MIN_CONFIDENCE})`);
lines.push('');
lines.push('Aday poz ve fiyatı aşağıda; doğruysa elle girin.');
lines.push('');
lines.push(...DETAIL_HEADER);

for (const item of report.filter((i) => i.band !== 'missing' && !i.filled)) {
  lines.push(detailRow(item));
}

lines.push('');
lines.push(`## Dolduruldu, ama kontrol edilmeli (${MIN_CONFIDENCE}–79)`);
lines.push('');
lines.push(...DETAIL_HEADER);

for (const item of report.filter((i) => i.filled && i.confidence < 80)) {
  lines.push(detailRow(item));
}

const outputReport = join(dirname(xlsxPath), basename(xlsxPath).replace(/\.xlsx$/i, '-rapor.md'));
writeFileSync(outputReport, lines.join('\n'), 'utf8');

console.log(`kitap pozları : ${book.length} (kopmuş fiyat bloğundan kurtarılan: ${recoveredRows})`);
console.log(`cetvel satırı : ${report.length}`);
console.log(`yüksek (≥80)  : ${stats.high}`);
console.log(`orta (55-79)  : ${stats.medium}`);
console.log(`düşük (<55)   : ${stats.low}`);
console.log(`fiyat yok     : ${stats.missing}`);
console.log(`eşleşme yok   : ${stats.none}`);
console.log(`\nF dolduruldu  : ${report.length - stats.blank}`);
console.log(`F boş (<${MIN_CONFIDENCE})   : ${stats.blank}`);
console.log(
  `toplam tutar  : ${grandTotal.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`,
);
console.log(`\nxlsx  : ${outputXlsx}`);
console.log(`rapor : ${outputReport}`);
