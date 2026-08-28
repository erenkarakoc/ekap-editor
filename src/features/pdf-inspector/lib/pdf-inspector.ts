import type {
  PdfClassification,
  PdfProcessResult,
  ProcessOptions,
} from '@firecrawl/pdf-inspector-wasm';

export type {
  LayoutComplexity,
  MarkdownProfile,
  PageOcrReasons,
  PdfClassification,
  PdfProcessResult,
  PdfType,
  ProcessOptions,
} from '@firecrawl/pdf-inspector-wasm';

type WasmModule = typeof import('@firecrawl/pdf-inspector-wasm');

// Served from public/, kept in sync by scripts/copy-pdf-wasm.mjs
const WASM_URL = '/wasm/pdf_inspector_wasm_bg.wasm';

let modulePromise: Promise<WasmModule> | null = null;

/**
 * Load and initialise the WebAssembly module once per browser session.
 * The ~4.8 MB binary is only fetched the first time a PDF is processed.
 */
function loadModule(): Promise<WasmModule> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('pdf-inspector can only run in the browser'));
  }

  if (!modulePromise) {
    modulePromise = import('@firecrawl/pdf-inspector-wasm')
      .then(async (mod) => {
        await mod.default({ module_or_path: WASM_URL });
        return mod;
      })
      .catch((error) => {
        // Allow a later call to retry instead of caching the failure
        modulePromise = null;
        throw error;
      });
  }

  return modulePromise;
}

/**
 * Warm up the parser ahead of time, e.g. when a PDF upload dialog opens.
 */
export async function preloadPdfInspector(): Promise<void> {
  await loadModule();
}

async function toBytes(input: File | Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

/**
 * Classify a PDF and convert its native text into Markdown.
 *
 * Extraction is synchronous once the module is loaded, so it blocks the main
 * thread while it runs (~200 ms for a typical text PDF, longer for large or
 * scanned files). Move this into a Web Worker if that becomes noticeable.
 */
export async function processPdf(
  input: File | Blob | ArrayBuffer | Uint8Array,
  options?: ProcessOptions,
): Promise<PdfProcessResult> {
  const [mod, bytes] = await Promise.all([loadModule(), toBytes(input)]);
  return mod.processPdf(bytes, options);
}

/**
 * Detect whether a PDF is text-based or needs OCR, without extracting Markdown.
 */
export async function detectPdf(
  input: File | Blob | ArrayBuffer | Uint8Array,
  options?: Pick<ProcessOptions, 'password'>,
): Promise<PdfProcessResult> {
  const [mod, bytes] = await Promise.all([loadModule(), toBytes(input)]);
  return mod.detectPdf(bytes, options);
}

/**
 * Lightweight classification: type, page count and pages needing OCR.
 */
export async function classifyPdf(
  input: File | Blob | ArrayBuffer | Uint8Array,
): Promise<PdfClassification> {
  const [mod, bytes] = await Promise.all([loadModule(), toBytes(input)]);
  return mod.classifyPdf(bytes);
}

/**
 * Plain text extraction, without Markdown structure.
 */
export async function extractText(
  input: File | Blob | ArrayBuffer | Uint8Array,
): Promise<string> {
  const [mod, bytes] = await Promise.all([loadModule(), toBytes(input)]);
  return mod.extractText(bytes);
}

/**
 * Version of the underlying WebAssembly package.
 */
export async function pdfInspectorVersion(): Promise<string> {
  const mod = await loadModule();
  return mod.version();
}
