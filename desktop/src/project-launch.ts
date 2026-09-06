import path from 'node:path';

// Windows and Linux pass a double-clicked file as a bare argument. The argument
// list also carries the executable and Electron/Chromium switches, and in
// development it carries the script path, so match on the extension rather than
// on a fixed position.
export function projectPathFromArgv(argv: string[]): string | null {
  const candidate = argv
    .slice(1)
    .find((arg) => !arg.startsWith('-') && path.extname(arg).toLowerCase() === '.icmal');
  return candidate ? path.resolve(candidate) : null;
}
