import fs from 'node:fs';
import path from 'node:path';

export const APP_NAME = 'İcmal';
export const APP_ID = 'com.icmal.app';

/** Reuse an existing profile in place so cookies, settings and encrypted data survive. */
export function userDataPath(appData: string, isPackaged: boolean): string {
  const legacyNames = isPackaged
    ? ['EKAP Editör', 'ekap-editor-desktop']
    : ['ekap-editor-desktop', 'EKAP Editör'];
  const current = path.join(appData, 'icmal');
  if (fs.existsSync(current)) return current;
  for (const name of legacyNames) {
    const legacy = path.join(appData, name);
    if (fs.existsSync(legacy) && fs.statSync(legacy).isDirectory()) return legacy;
  }
  return current;
}
