/**
 * Build script that assembles the Next.js standalone bundle
 * into desktop/nextjs-standalone/ for electron-builder to package.
 */
import { execSync } from 'node:child_process';
import { cpSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(__dirname, '..');
const projectRoot = resolve(desktopDir, '..');
const outputDir = resolve(desktopDir, 'nextjs-standalone');

console.log('[build-nextjs] Building Next.js app...');
execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });

// Clean previous output
if (existsSync(outputDir)) {
  console.log('[build-nextjs] Cleaning previous standalone bundle...');
  rmSync(outputDir, { recursive: true, force: true });
}

// Copy .next/standalone/ → desktop/nextjs-standalone/
const standaloneDir = resolve(projectRoot, '.next', 'standalone');
if (!existsSync(standaloneDir)) {
  console.error(
    '[build-nextjs] ERROR: .next/standalone/ not found. Is output: "standalone" set in next.config.ts?',
  );
  process.exit(1);
}
console.log('[build-nextjs] Copying standalone server...');
cpSync(standaloneDir, outputDir, { recursive: true });

// Copy .next/static/ → desktop/nextjs-standalone/.next/static/
const staticSrc = resolve(projectRoot, '.next', 'static');
const staticDest = resolve(outputDir, '.next', 'static');
if (existsSync(staticSrc)) {
  console.log('[build-nextjs] Copying static assets...');
  cpSync(staticSrc, staticDest, { recursive: true });
}

// Copy public/ → desktop/nextjs-standalone/public/
const publicSrc = resolve(projectRoot, 'public');
const publicDest = resolve(outputDir, 'public');
if (existsSync(publicSrc)) {
  console.log('[build-nextjs] Copying public directory...');
  cpSync(publicSrc, publicDest, { recursive: true });
}

// Copy .env → desktop/nextjs-standalone/.env
const envSrc = resolve(projectRoot, '.env');
const envDest = resolve(outputDir, '.env');
if (existsSync(envSrc)) {
  console.log('[build-nextjs] Copying .env...');
  copyFileSync(envSrc, envDest);
}

console.log('[build-nextjs] Standalone bundle ready at desktop/nextjs-standalone/');
