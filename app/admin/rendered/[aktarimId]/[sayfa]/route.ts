import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { adminOturumunuDogrula } from '@features/auth/dal';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ aktarimId: string; sayfa: string }> },
) {
  await adminOturumunuDogrula();
  const { aktarimId, sayfa: sayfaMetni } = await params;
  const sayfa = Number(sayfaMetni);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(aktarimId) ||
    !Number.isInteger(sayfa) ||
    sayfa < 1
  ) {
    return new Response('Geçersiz render yolu.', { status: 400 });
  }

  const kok = path.resolve(
    /* turbopackIgnore: true */
    process.env.KAMU_POZ_RENDERED_ROOT ?? path.join(process.cwd(), '..', 'storage', 'rendered'),
  );
  const dosya = path.resolve(kok, aktarimId, `s${String(sayfa).padStart(5, '0')}.png`);
  const goreli = path.relative(kok, dosya);
  if (goreli.startsWith('..') || path.isAbsolute(goreli)) {
    return new Response('Geçersiz render yolu.', { status: 400 });
  }

  try {
    const veri = await readFile(dosya);
    return new Response(new Uint8Array(veri), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    const mesaj = `Sayfa ${sayfa} render'ı bu sunucuda bulunamadı`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 900"><rect width="640" height="900" fill="#f1f5f9"/><path d="M240 330h160v190H240z" fill="none" stroke="#94a3b8" stroke-width="8"/><path d="M270 380h100M270 420h100M270 460h70" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/><text x="320" y="590" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#475569">${mesaj}</text></svg>`;
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
