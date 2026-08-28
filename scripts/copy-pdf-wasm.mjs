// Copies the pdf-inspector WebAssembly binary into public/ so the browser can
// fetch it from a stable URL (/wasm/pdf_inspector_wasm_bg.wasm) instead of
// relying on bundler-specific asset resolution inside the wasm-bindgen glue.
// Runs automatically via the predev/prebuild npm hooks.

import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const source = join(
  projectRoot,
  'node_modules',
  '@firecrawl',
  'pdf-inspector-wasm',
  'pdf_inspector_wasm_bg.wasm',
);
const targetDir = join(projectRoot, 'public', 'wasm');
const target = join(targetDir, 'pdf_inspector_wasm_bg.wasm');

async function main() {
  try {
    await stat(source);
  } catch {
    console.error(
      '[copy-pdf-wasm] @firecrawl/pdf-inspector-wasm is not installed. Run `npm install` first.',
    );
    process.exit(1);
  }

  await mkdir(targetDir, { recursive: true });
  await copyFile(source, target);
  console.log('[copy-pdf-wasm] public/wasm/pdf_inspector_wasm_bg.wasm updated');
}

main().catch((error) => {
  console.error('[copy-pdf-wasm] failed:', error);
  process.exit(1);
});
