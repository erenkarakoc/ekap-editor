// Cross-checks kitap.json against the per-book extractions.
//
// The merged book draws its description column separately from its poz column,
// so the one failure that would quietly corrupt everything is an off-by-one:
// every description attached to its neighbour's poz. That is what this checks —
// each row is scored against the same poz in the reference books *and* against
// the neighbouring poz numbers. If the neighbour ever wins, the columns slipped.
//
//   node scripts/verify-kitap.mjs data/books/new/kitap.json data/books/new/*.json

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const [kitapPath, ...referencePaths] = process.argv.slice(2);
if (!kitapPath || referencePaths.length === 0) {
  console.error('usage: node scripts/verify-kitap.mjs <kitap.json> <kaynak.json> [...]');
  process.exit(1);
}

const normalize = (text) =>
  String(text ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const tokens = (text) => new Set(normalize(text).split(' ').filter((t) => t.length > 1));

/** Share of the reference's words that appear in the candidate. */
function overlap(reference, candidate) {
  const a = tokens(reference);
  const b = tokens(candidate);
  if (a.size === 0) return null;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return shared / a.size;
}

const kitap = new Map(
  JSON.parse(readFileSync(kitapPath, 'utf8')).map((row) => [row.poz, row]),
);

const reference = new Map();
for (const path of referencePaths) {
  if (path === kitapPath) continue;
  for (const row of JSON.parse(readFileSync(path, 'utf8'))) {
    if (!reference.has(row.poz)) reference.set(row.poz, { ...row, book: basename(path) });
  }
}

const ordered = [...kitap.keys()].sort();
const position = new Map(ordered.map((poz, index) => [poz, index]));

let common = 0;
let aligned = 0;
let shifted = 0;
let weak = 0;
const shiftExamples = [];
const weakExamples = [];

for (const [poz, row] of reference) {
  const mine = kitap.get(poz);
  if (!mine) continue;
  common++;

  const self = overlap(row.description, `${mine.description} ${mine.context}`);
  if (self === null) continue;

  // the same comparison against the rows immediately above and below
  const index = position.get(poz);
  let best = self;
  let bestPoz = poz;
  for (const offset of [-2, -1, 1, 2]) {
    const neighbour = kitap.get(ordered[index + offset]);
    if (!neighbour) continue;
    const score = overlap(row.description, `${neighbour.description} ${neighbour.context}`);
    if (score !== null && score > best + 0.15) {
      best = score;
      bestPoz = ordered[index + offset];
    }
  }

  if (bestPoz !== poz) {
    shifted++;
    if (shiftExamples.length < 8) {
      shiftExamples.push(
        `  ${poz}: kaynak "${row.description.slice(0, 55)}" → kitap.pdf'te ${bestPoz} ile daha iyi eşleşiyor (${Math.round(best * 100)}% vs ${Math.round(self * 100)}%)`,
      );
    }
  } else if (self >= 0.6) {
    aligned++;
  } else {
    weak++;
    if (weakExamples.length < 8) {
      weakExamples.push(
        `  ${poz} (%${Math.round(self * 100)})\n     kaynak: ${row.description.slice(0, 80)}\n     kitap : ${mine.description.slice(0, 80)} | ${mine.context.slice(0, 60)}`,
      );
    }
  }
}

console.log(`ortak poz          : ${common}`);
console.log(`hizalı (≥%60)      : ${aligned} (%${Math.round((aligned / common) * 100)})`);
console.log(`zayıf örtüşme      : ${weak}`);
console.log(`KAYMA ŞÜPHESİ      : ${shifted}`);

if (shifted > 0) {
  console.log('\n-- komşu poz daha iyi eşleşenler --');
  shiftExamples.forEach((line) => console.log(line));
}
if (weak > 0) {
  console.log('\n-- zayıf örtüşen örnekler (kaynak kitaplar bozuk olabilir) --');
  weakExamples.forEach((line) => console.log(line));
}

const onlyKitap = [...kitap.keys()].filter((poz) => !reference.has(poz)).length;
const onlyReference = [...reference.keys()].filter((poz) => !kitap.has(poz)).length;
console.log(`\nyalnızca kitap.pdf'te: ${onlyKitap} poz`);
console.log(`yalnızca kaynaklarda : ${onlyReference} poz`);
