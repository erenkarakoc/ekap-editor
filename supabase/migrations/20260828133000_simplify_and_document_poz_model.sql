-- Herpoz poz detay ekraninda gozlenen alanlara gore sade poz modeli.
-- Bu migration veri kaybini onlemek icin kaldirilacak tablolar bos degilse durur.

do $$
begin
  if exists (select 1 from public.poz_iliskileri limit 1) then
    raise exception 'public.poz_iliskileri bos degil; otomatik olarak kaldirilamaz';
  end if;
  if exists (select 1 from public.revizyonlar limit 1) then
    raise exception 'public.revizyonlar bos degil; otomatik olarak kaldirilamaz';
  end if;
  if exists (select 1 from private.kaynak_liste_kayitlari limit 1) then
    raise exception 'private.kaynak_liste_kayitlari bos degil; otomatik olarak kaldirilamaz';
  end if;
end
$$;
drop table public.poz_iliskileri;
drop table public.revizyonlar;
drop table private.kaynak_liste_kayitlari;
alter table public.poz_surumleri
  add column eski_kod_ham text,
  add column eski_kod_normalize text,
  add column tanim_on_eki text,
  add column tanim_son_eki text,
  add column kategori_ham text,
  add column alt_kategori_ham text,
  add column satin_alma_yeri text,
  add column notlar text,
  add constraint poz_surumleri_eski_kod_butunluk_kontrolu check (
    (eski_kod_ham is null and eski_kod_normalize is null)
    or (
      btrim(coalesce(eski_kod_ham, '')) <> ''
      and btrim(coalesce(eski_kod_normalize, '')) <> ''
    )
  );
create index poz_surumleri_sahip_eski_kod_idx
  on public.poz_surumleri(sahip_id, eski_kod_normalize)
  where eski_kod_normalize is not null;
comment on column public.poz_surumleri.eski_kod_ham is
  'Resmi yayinda gorundugu bicimiyle eski poz numarasi.';
comment on column public.poz_surumleri.eski_kod_normalize is
  'Arama ve eslestirme icin normalize edilmis eski poz numarasi.';
comment on column public.poz_surumleri.tanim_on_eki is
  'Kaynakta ana tanimdan ayri verilmisse tanimin on eki.';
comment on column public.poz_surumleri.tanim_son_eki is
  'Kaynakta ana tanimdan ayri verilmisse tanimin son eki.';
comment on column public.poz_surumleri.kategori_ham is
  'Kaynak kitapta gorundugu bicimiyle ust kategori.';
comment on column public.poz_surumleri.alt_kategori_ham is
  'Kaynak kitapta gorundugu bicimiyle alt kategori.';
comment on column public.poz_surumleri.satin_alma_yeri is
  'Kaynakta belirtilen satin alma veya temin yeri.';
comment on column public.poz_surumleri.notlar is
  'Poz satirina ait genel kaynak notu.';
alter table public.fiyatlar
  drop constraint prices_price_kind_check,
  add constraint fiyatlar_fiyat_turu_kontrolu check (
    fiyat_turu in (
      'unit_price', 'montage_price', 'demontage_price',
      'rayic', 'karsiz', 'component_unit_price', 'other'
    )
  );
comment on column public.fiyatlar.fiyat_turu is
  'unit_price ana fiyat; montage_price montaj; demontage_price demontaj fiyatidir.';
create view public.v_poz_detay
with (security_invoker = true)
as
select
  ps.sahip_id,
  p.id as poz_id,
  ps.id as poz_surumu_id,
  k.kod as kurum_kodu,
  k.ad as kurum_adi,
  ka.aile_anahtari as kitap_anahtari,
  ka.ad as kitap_adi,
  f.ad_ham as fasikul_adi,
  p.kod_ham as poz_numarasi,
  ps.eski_kod_ham as eski_poz_numarasi,
  ps.tanim_ham as tanim,
  ps.tanim_on_eki,
  ps.tanim_son_eki,
  ps.birim_ham as birim,
  ps.kategori_ham as kategori,
  ps.alt_kategori_ham as alt_kategori,
  ps.satin_alma_yeri,
  ps.notlar,
  ps.kayit_turu as poz_turu,
  y.donem_etiketi_ham as donem,
  y.donem_yili as yil,
  y.donem_ayi as ay,
  y.donem_revizyonu as donem_revizyonu,
  fiyat.fiyatlar,
  endeks.guncelleme_endeksleri,
  tarif.tarif,
  tarif.olcum_kurali,
  tarif.odeme_esasi,
  gider.dahil_olan_masraflar,
  gider.dahil_olmayan_masraflar,
  analiz.analiz_satiri_sayisi,
  b.kaynak_url,
  b.sha256 as kaynak_sha256,
  ps.kaynak_sayfa,
  ps.kaynak_tablo,
  ps.kaynak_satir
from public.poz_surumleri ps
join public.pozlar p
  on p.sahip_id = ps.sahip_id and p.id = ps.poz_id
join public.kurumlar k
  on k.sahip_id = ps.sahip_id and k.id = ps.kurum_id
join public.kitap_aileleri ka
  on ka.sahip_id = ps.sahip_id and ka.id = ps.kitap_ailesi_id
join public.yayinlar y
  on y.sahip_id = ps.sahip_id and y.id = ps.yayin_id
join public.belgeler b
  on b.sahip_id = ps.sahip_id and b.id = ps.kaynak_belge_id
left join public.fasikuller f
  on f.sahip_id = ps.sahip_id and f.id = ps.fasikul_id
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'fiyat_turu', fi.fiyat_turu,
      'tutar', fi.tutar,
      'para_birimi_kodu', fi.para_birimi_kodu,
      'kar_dahil_mi', fi.kar_dahil_mi,
      'kdv_dahil_mi', fi.kdv_dahil_mi
    ) order by fi.fiyat_turu, fi.para_birimi_kodu
  ) as fiyatlar
  from public.fiyatlar fi
  where fi.sahip_id = ps.sahip_id and fi.poz_surumu_id = ps.id
) fiyat on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'kod', ge.endeks_kodu_ham,
      'tanim', ge.endeks_tanimi_ham
    ) order by ge.endeks_kodu_normalize
  ) as guncelleme_endeksleri
  from public.guncelleme_endeksleri ge
  where ge.sahip_id = ps.sahip_id and ge.poz_surumu_id = ps.id
) endeks on true
left join lateral (
  select
    max(t.tarif_ham) as tarif,
    max(t.olcum_kurali_ham) as olcum_kurali,
    max(t.odeme_esasi_ham) as odeme_esasi
  from public.tarifler t
  where t.sahip_id = ps.sahip_id and t.poz_surumu_id = ps.id
) tarif on true
left join lateral (
  select
    jsonb_agg(gn.not_ham order by gn.sira_no)
      filter (where gn.not_turu = 'included') as dahil_olan_masraflar,
    jsonb_agg(gn.not_ham order by gn.sira_no)
      filter (where gn.not_turu = 'excluded') as dahil_olmayan_masraflar
  from public.gider_notlari gn
  where gn.sahip_id = ps.sahip_id and gn.poz_surumu_id = ps.id
) gider on true
left join lateral (
  select count(*)::integer as analiz_satiri_sayisi
  from public.analiz_satirlari a
  where a.sahip_id = ps.sahip_id and a.ana_poz_surumu_id = ps.id
) analiz on true;
comment on view public.v_poz_detay is
  'Poz numarasi, eski numara, tanim, birim, kitap, fasikul, tur, donem, fiyat, endeks, tarif, gider ve analiz ozetini tek satirda sunar.';
create view public.v_poz_kullanildigi_analizler
with (security_invoker = true)
as
select
  a.sahip_id,
  a.bilesen_poz_id as kullanilan_poz_id,
  ana_poz.id as kullanan_poz_id,
  ana_poz.kod_ham as kullanan_poz_numarasi,
  ana_surum.tanim_ham as kullanan_poz_tanimi,
  ana_surum.birim_ham as kullanan_poz_birimi,
  y.donem_etiketi_ham as donem,
  a.satir_no,
  a.miktar,
  a.birim_fiyat,
  a.satir_toplami
from public.analiz_satirlari a
join public.poz_surumleri ana_surum
  on ana_surum.sahip_id = a.sahip_id and ana_surum.id = a.ana_poz_surumu_id
join public.pozlar ana_poz
  on ana_poz.sahip_id = ana_surum.sahip_id and ana_poz.id = ana_surum.poz_id
join public.yayinlar y
  on y.sahip_id = ana_surum.sahip_id and y.id = ana_surum.yayin_id
where a.bilesen_poz_id is not null;
comment on view public.v_poz_kullanildigi_analizler is
  'Bir pozun hangi poz analizlerinde kullanildigini analiz satirlarindan turetir; ayri iliski tablosu gerektirmez.';
comment on table public.kurumlar is 'Poz kitabini veya resmi yayini cikaran kamu kurumlari.';
comment on table public.kaynak_kataloglari is 'Bir kurumun takip edilen resmi yayin/katalog sayfalari ve kullanim notlari.';
comment on table public.kitap_aileleri is 'Ayni kurumun yillar boyunca devam eden kitap veya kitap serileri.';
comment on table public.fasikuller is 'Kitaplarin bolum/fasikul siniflandirmasi.';
comment on table public.yayinlar is 'Bir kitap ya da listenin belirli yil, ay veya revizyon donemindeki resmi yayini.';
comment on table public.belgeler is 'Indirilen resmi PDF, Excel veya diger kaynak dosyalarinin URL, hash ve saklama bilgileri.';
comment on table public.yayin_belgeleri is 'Bir yayini ona ait bir veya daha fazla resmi belgeyle baglar.';
comment on table public.pozlar is 'Donemlerden bagimsiz kalici poz kimligi ve guncel durum bilgisi.';
comment on table public.poz_surumleri is 'Pozun belirli bir yayindaki numara, eski numara, tanim, birim, tur ve kaynak konumu.';
comment on table public.fiyatlar is 'Bir poz surumunun para birimi ve fiyat turune gore resmi fiyatlari.';
comment on table public.tarifler is 'Poz tarifi, olcum kurali ve odeme esasi.';
comment on table public.gider_notlari is 'Poz fiyatina dahil olan, dahil olmayan veya diger masraf notlari.';
comment on table public.analiz_satirlari is 'Bir poz analizindeki iscilik, malzeme, makine ve diger bilesen satirlari.';
comment on table public.guncelleme_endeksleri is 'Poz surumune atanmis resmi guncelleme endeksi kodu ve tanimi.';
comment on table public.birim_sozlugu is 'Kaynaklardaki farkli birim yazimlarini ortak birim koduna esler.';
comment on table public.aktarim_calismalari is 'Her veri aktariminin surum, durum, sayac ve kalite kontrol kaydi.';
comment on table private.ham_satirlar is 'Resmi belgeden cikarilan, degistirilmeden saklanan kaynak satirlari.';
comment on table private.ayristirma_hatalari is 'Ham satirlar ayristrilirken bulunan hata ve inceleme kayitlari.';
grant select on public.v_poz_detay to authenticated;
grant select on public.v_poz_kullanildigi_analizler to authenticated;
