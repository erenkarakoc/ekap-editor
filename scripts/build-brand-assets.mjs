import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Convert the approved SVGs, without redrawing them, into platform packaging formats.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const brand = resolve(root, 'public/assets/images/brand');
const sizes = [16, 24, 32, 48, 64, 128, 256];

async function buildIco(source) {
  const images = await Promise.all(
    sizes.map((size) => sharp(source, { density: 384 }).resize(size, size).png().toBuffer()),
  );
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, i) => {
    const entry = 6 + i * 16;
    header[entry] = sizes[i] === 256 ? 0 : sizes[i];
    header[entry + 1] = header[entry];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([header, ...images]);
}

// Application identity: window, taskbar, installer and browser tab.
const appSource = resolve(brand, 'favicon_primary.svg');
const appIco = await buildIco(appSource);
await writeFile(resolve(brand, 'favicon.ico'), appIco);
await writeFile(resolve(root, 'app/favicon.ico'), appIco);
await sharp(appSource, { density: 768 })
  .resize(512, 512)
  .png()
  .toFile(resolve(brand, 'app-icon.png'));
await sharp(appSource, { density: 384 })
  .resize(180, 180)
  .png()
  .toFile(resolve(brand, 'apple-touch-icon.png'));

// Document identity: the .icmal file association registered by the installer.
await writeFile(resolve(brand, 'file-icon.ico'), await buildIco(resolve(brand, 'file_icon.svg')));

console.log('İcmal brand assets generated.');
