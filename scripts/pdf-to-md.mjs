// Converts birim fiyat kitabı PDFs to Markdown with pdf-inspector (Node, via
// the WebAssembly build). Writes <name>.md next to each input file.
//
//   node scripts/pdf-to-md.mjs data/books/new/elektrik.pdf [...]

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { initSync, processPdf } from '@firecrawl/pdf-inspector-wasm';

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error('usage: node scripts/pdf-to-md.mjs <file.pdf> [...]');
  process.exit(1);
}

initSync({
  module: readFileSync('node_modules/@firecrawl/pdf-inspector-wasm/pdf_inspector_wasm_bg.wasm'),
});

for (const input of inputs) {
  const output = join(dirname(input), basename(input).replace(/\.pdf$/i, '.md'));
  const started = Date.now();
  const result = processPdf(new Uint8Array(readFileSync(input)), { includePageMarkers: true });
  writeFileSync(output, result.markdown ?? '', 'utf8');

  console.log(
    [
      basename(input),
      `→ ${output}`,
      `${result.pdfType}`,
      `${result.pageCount} sayfa`,
      `${(result.markdown ?? '').length} karakter`,
      `${Math.round((Date.now() - started) / 1000)} sn`,
      result.pagesNeedingOcr.length ? `OCR gereken: ${result.pagesNeedingOcr.length} sayfa` : 'OCR yok',
    ].join(' | '),
  );
}
