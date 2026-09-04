import { adminOturumunuDogrula } from '@features/auth/dal';
import { createClient } from '@shared/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface KaynakBelgeYaniti {
  kaynak_url: string;
  dosya_adi: string | null;
  mime_turu: string | null;
  depolama_kovasi: string | null;
  depolama_yolu: string | null;
}

async function kaynakYaniti(
  request: Request,
  { params }: { params: Promise<{ pozSurumuId: string }> },
  headOnly: boolean,
) {
  await adminOturumunuDogrula();
  const { pozSurumuId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pozSurumuId)
  ) {
    return Response.json({ error: 'Geçersiz poz sürümü.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_poz_kaynak_belgesi', {
    p_poz_surumu_id: pozSurumuId,
  });
  if (error || !data) {
    return Response.json({ error: 'Kaynak belge bulunamadı.' }, { status: 404 });
  }
  const belge = data as KaynakBelgeYaniti;
  let url = belge.kaynak_url;
  if (belge.depolama_kovasi && belge.depolama_yolu) {
    const { data: imzali, error: imzaHatasi } = await supabase.storage
      .from(belge.depolama_kovasi)
      .createSignedUrl(belge.depolama_yolu, 120);
    if (!imzaHatasi && imzali?.signedUrl) url = imzali.signedUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: 'Kaynak belge adresi geçersiz.' }, { status: 502 });
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    return Response.json({ error: 'Kaynak belge güvenli bir adreste değil.' }, { status: 502 });
  }

  const upstreamHeaders = new Headers();
  for (const ad of ['range', 'if-none-match', 'if-modified-since']) {
    const deger = request.headers.get(ad);
    if (deger) upstreamHeaders.set(ad, deger);
  }
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: headOnly ? 'HEAD' : 'GET',
      headers: upstreamHeaders,
      cache: 'no-store',
      redirect: 'follow',
    });
  } catch {
    return Response.json({ error: 'Kaynak PDF sunucusuna ulaşılamadı.' }, { status: 502 });
  }
  if (!upstream.ok && upstream.status !== 206 && upstream.status !== 304) {
    return Response.json({ error: 'Kaynak PDF alınamadı.' }, { status: 502 });
  }

  const headers = new Headers({
    'Cache-Control': 'private, max-age=300',
    'Content-Type': upstream.headers.get('content-type') ?? belge.mime_turu ?? 'application/pdf',
    'Content-Disposition': `inline; filename="${dosyaAdi(belge.dosya_adi)}"`,
    'X-Content-Type-Options': 'nosniff',
  });
  for (const ad of ['accept-ranges', 'content-length', 'content-range', 'etag', 'last-modified']) {
    const deger = upstream.headers.get(ad);
    if (deger) headers.set(ad, deger);
  }
  return new Response(headOnly ? null : upstream.body, { status: upstream.status, headers });
}

function dosyaAdi(ad: string | null) {
  const temiz = (ad ?? 'kaynak.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  return temiz.toLowerCase().endsWith('.pdf') ? temiz : `${temiz}.pdf`;
}

export async function GET(request: Request, context: { params: Promise<{ pozSurumuId: string }> }) {
  return kaynakYaniti(request, context, false);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ pozSurumuId: string }> },
) {
  return kaynakYaniti(request, context, true);
}
