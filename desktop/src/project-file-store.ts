import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
export const PROJECT_LIMIT = 8 * 1024 * 1024;
export const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export async function fileDigest(target: string): Promise<string | null> {
  try { const stat = await fs.lstat(target); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > PROJECT_LIMIT) throw new Error('Uygun olmayan dosya.');
    return digest(await fs.readFile(target));
  } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
}
export async function writeProject(target: string, bytes: Uint8Array, expected: string | null): Promise<string> {
  if (path.extname(target).toLowerCase() !== '.icmal' || !bytes.length || bytes.length > PROJECT_LIMIT) throw new Error('Geçersiz proje dosyası.');
  const temp = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
  try {
    const handle = await fs.open(temp, 'wx', 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    if (await fileDigest(target) !== expected) throw new Error('Dosya dışarıdan değiştirildi. Farklı kaydet kullanın.');
    if (expected === null) {
      // link fails if another process created the target after the existence check.
      await fs.link(temp, target);
    } else await fs.rename(temp, target);
    return digest(bytes);
  } finally { await fs.unlink(temp).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
}
