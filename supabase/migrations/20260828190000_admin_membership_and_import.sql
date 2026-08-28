begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_mi()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

comment on function public.admin_mi() is
  'Oturumdaki app_metadata.role değeri admin ise true döner.';

revoke all on function public.admin_mi() from public, anon;
grant execute on function public.admin_mi() to authenticated;

create or replace function public.katalog_sahibi_mi(p_sahip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_sahip_id
      and coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin'
  );
$$;

comment on function public.katalog_sahibi_mi(uuid) is
  'Veri sahibinin Auth app_metadata rolünün admin olup olmadığını denetler.';

revoke all on function public.katalog_sahibi_mi(uuid) from public, anon;
grant execute on function public.katalog_sahibi_mi(uuid) to authenticated;

create table public.kullanici_profilleri (
  id uuid primary key references auth.users(id) on delete cascade,
  eposta text not null,
  ad_soyad text,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now()
);

comment on table public.kullanici_profilleri is
  'Auth kullanıcılarının uygulamada görünen temel profil bilgileri.';

create table public.uyelik_paketleri (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  ad text not null,
  aciklama text,
  seviye smallint not null unique,
  ucretsiz_mi boolean not null default false,
  aktif_mi boolean not null default true,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint uyelik_paketleri_kod_kontrolu check (kod ~ '^[a-z0-9_]+$'),
  constraint uyelik_paketleri_seviye_kontrolu check (seviye between 0 and 100)
);

comment on table public.uyelik_paketleri is
  'Ücretsiz, Standart ve Pro üyelik paketlerinin düzenlenebilir tanımları.';

create table public.paket_donemleri (
  id uuid primary key default gen_random_uuid(),
  paket_id uuid not null references public.uyelik_paketleri(id) on delete cascade,
  donem text not null,
  sure_ay smallint not null,
  fiyat numeric(12,2),
  para_birimi text not null default 'TRY',
  aktif_mi boolean not null default false,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  unique (paket_id, donem),
  constraint paket_donemleri_donem_kontrolu check (donem in ('aylik', 'yillik')),
  constraint paket_donemleri_sure_kontrolu check (sure_ay in (1, 12)),
  constraint paket_donemleri_fiyat_kontrolu check (fiyat is null or fiyat >= 0),
  constraint paket_donemleri_para_birimi_kontrolu check (para_birimi ~ '^[A-Z]{3}$')
);

comment on table public.paket_donemleri is
  'Üyelik paketlerinin aylık ve yıllık fiyatları; admin ayarlayana kadar pasiftir.';

create table public.ozellikler (
  kod text primary key,
  ad text not null,
  aciklama text not null,
  kategori text not null,
  aktif_mi boolean not null default true,
  sira_no integer not null default 0,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint ozellikler_kod_kontrolu check (kod ~ '^[a-z0-9_]+$')
);

comment on table public.ozellikler is
  'Paketlere atanabilen poz arama, fiyat, geçmiş, analiz ve dışa aktarma yetenekleri.';

create table public.paket_ozellikleri (
  paket_id uuid not null references public.uyelik_paketleri(id) on delete cascade,
  ozellik_kodu text not null references public.ozellikler(kod) on delete cascade,
  olusturulma_zamani timestamptz not null default now(),
  primary key (paket_id, ozellik_kodu)
);

comment on table public.paket_ozellikleri is
  'Adminin her paket için açtığı özellikler. Başlangıçta boş ve kilitlidir.';

create table public.banka_hesaplari (
  id uuid primary key default gen_random_uuid(),
  banka_adi text not null,
  alici_adi text not null,
  iban text not null unique,
  aciklama text,
  aktif_mi boolean not null default true,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint banka_hesaplari_iban_kontrolu check (
    replace(upper(iban), ' ', '') ~ '^TR[0-9]{24}$'
  )
);

comment on table public.banka_hesaplari is
  'Kullanıcılara ödeme ekranında gösterilecek admin yönetimli IBAN hesapları.';

create table public.odeme_bildirimleri (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references auth.users(id) on delete cascade,
  paket_donemi_id uuid not null references public.paket_donemleri(id),
  banka_hesabi_id uuid references public.banka_hesaplari(id),
  tutar numeric(12,2) not null,
  para_birimi text not null default 'TRY',
  dekont_yolu text not null,
  kullanici_aciklamasi text,
  durum text not null default 'bekliyor',
  admin_notu text,
  inceleyen_admin_id uuid references auth.users(id),
  incelenme_zamani timestamptz,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint odeme_bildirimleri_durum_kontrolu check (
    durum in ('bekliyor', 'onaylandi', 'reddedildi', 'iptal_edildi')
  ),
  constraint odeme_bildirimleri_tutar_kontrolu check (tutar >= 0),
  constraint odeme_bildirimleri_profil_fk foreign key (kullanici_id)
    references public.kullanici_profilleri(id) on delete cascade,
  constraint odeme_bildirimleri_dekont_yolu_kontrolu check (
    dekont_yolu like kullanici_id::text || '/%'
  )
);

comment on table public.odeme_bildirimleri is
  'Kullanıcının yüklediği dekont ve adminin onay/red kararının denetim kaydı.';

create table public.abonelikler (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references auth.users(id) on delete cascade,
  paket_id uuid not null references public.uyelik_paketleri(id),
  paket_donemi_id uuid references public.paket_donemleri(id),
  odeme_bildirimi_id uuid unique references public.odeme_bildirimleri(id),
  baslangic_zamani timestamptz not null,
  bitis_zamani timestamptz,
  durum text not null default 'aktif',
  olusturan_admin_id uuid references auth.users(id),
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint abonelikler_durum_kontrolu check (
    durum in ('aktif', 'sona_erdi', 'iptal_edildi')
  ),
  constraint abonelikler_tarih_kontrolu check (
    bitis_zamani is null or bitis_zamani > baslangic_zamani
  ),
  constraint abonelikler_profil_fk foreign key (kullanici_id)
    references public.kullanici_profilleri(id) on delete cascade
);

comment on table public.abonelikler is
  'Kullanıcıların tarih aralıklı paket erişimleri; ücretsiz paket süresiz olabilir.';

create table public.yonetim_islem_kayitlari (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users(id),
  islem text not null,
  hedef_turu text not null,
  hedef_id text,
  detay jsonb not null default '{}'::jsonb,
  olusturulma_zamani timestamptz not null default now(),
  constraint yonetim_islem_kayitlari_detay_kontrolu check (jsonb_typeof(detay) = 'object')
);

comment on table public.yonetim_islem_kayitlari is
  'Adminin ödeme, üyelik, paket ve aktarım işlemlerine ait değiştirilemez audit kaydı.';

insert into public.uyelik_paketleri(kod, ad, aciklama, seviye, ucretsiz_mi)
values
  ('ucretsiz', 'Ücretsiz', 'Temel hesap. Veri özellikleri admin tarafından açılır.', 0, true),
  ('standart', 'Standart', 'Aylık veya yıllık Standart üyelik.', 10, false),
  ('pro', 'Pro', 'Aylık veya yıllık tüm profesyonel veri yetenekleri için hazır paket.', 20, false)
on conflict (kod) do update
set ad = excluded.ad,
    aciklama = excluded.aciklama,
    seviye = excluded.seviye,
    ucretsiz_mi = excluded.ucretsiz_mi;

insert into public.paket_donemleri(paket_id, donem, sure_ay, fiyat, aktif_mi)
select p.id, d.donem, d.sure_ay, null, false
from public.uyelik_paketleri p
cross join (values ('aylik'::text, 1::smallint), ('yillik'::text, 12::smallint)) d(donem, sure_ay)
where p.kod in ('standart', 'pro')
on conflict (paket_id, donem) do nothing;

insert into public.ozellikler(kod, ad, aciklama, kategori, sira_no)
values
  ('poz_temel', 'Poz temel bilgileri', 'Poz numarası, tanım, birim, kurum, kitap, fasikül ve dönem.', 'Poz verisi', 10),
  ('poz_fiyatlar', 'Poz fiyatları', 'Birim, montaj ve demontaj fiyatlarını görüntüleme.', 'Poz verisi', 20),
  ('poz_gecmisi', 'Fiyat ve sürüm geçmişi', 'Pozun ay/yıl bazlı fiyat ve sürüm değişimlerini görüntüleme.', 'Poz verisi', 30),
  ('poz_analizleri', 'Poz analizleri', 'Analiz satırları, tarifler, endeksler ve gider notları.', 'Poz verisi', 40),
  ('poz_disa_aktarim', 'Poz dışa aktarma', 'İzin verilen poz verisini Excel/CSV olarak indirme.', 'Poz verisi', 50)
on conflict (kod) do update
set ad = excluded.ad,
    aciklama = excluded.aciklama,
    kategori = excluded.kategori,
    sira_no = excluded.sira_no;

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'kullanici_profilleri', 'uyelik_paketleri', 'paket_donemleri',
    'ozellikler', 'banka_hesaplari', 'odeme_bildirimleri', 'abonelikler'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      v_table
    );
  end loop;
end;
$$;

create or replace function private.kullanici_profili_ve_ucretsiz_uyelik_olustur()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ucretsiz_paket_id uuid;
begin
  insert into public.kullanici_profilleri(id, eposta, ad_soyad)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
  set eposta = excluded.eposta,
      ad_soyad = coalesce(excluded.ad_soyad, public.kullanici_profilleri.ad_soyad),
      guncellenme_zamani = now();

  select id into v_ucretsiz_paket_id
  from public.uyelik_paketleri
  where kod = 'ucretsiz';

  if v_ucretsiz_paket_id is not null and not exists (
    select 1 from public.abonelikler where kullanici_id = new.id
  ) then
    insert into public.abonelikler(
      kullanici_id, paket_id, baslangic_zamani, bitis_zamani, durum
    ) values (new.id, v_ucretsiz_paket_id, now(), null, 'aktif');
  end if;
  return new;
end;
$$;

drop trigger if exists auth_kullanici_profili_olustur on auth.users;
create trigger auth_kullanici_profili_olustur
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function private.kullanici_profili_ve_ucretsiz_uyelik_olustur();

insert into public.kullanici_profilleri(id, eposta, ad_soyad)
select id, coalesce(email, ''), raw_user_meta_data ->> 'full_name'
from auth.users
on conflict (id) do update
set eposta = excluded.eposta,
    ad_soyad = coalesce(excluded.ad_soyad, public.kullanici_profilleri.ad_soyad);

insert into public.abonelikler(kullanici_id, paket_id, baslangic_zamani, durum)
select u.id, p.id, now(), 'aktif'
from auth.users u
cross join public.uyelik_paketleri p
where p.kod = 'ucretsiz'
  and not exists (select 1 from public.abonelikler a where a.kullanici_id = u.id);

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = 'erenkarakocw@gmail.com';

create or replace function public.ozellige_erisim_var_mi(p_ozellik_kodu text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.admin_mi() or exists (
    select 1
    from public.abonelikler a
    join public.paket_ozellikleri po on po.paket_id = a.paket_id
    join public.ozellikler o on o.kod = po.ozellik_kodu and o.aktif_mi
    where a.kullanici_id = auth.uid()
      and a.durum = 'aktif'
      and a.baslangic_zamani <= now()
      and (a.bitis_zamani is null or a.bitis_zamani > now())
      and po.ozellik_kodu = p_ozellik_kodu
  );
$$;

comment on function public.ozellige_erisim_var_mi(text) is
  'Admin veya aktif abonelik paketinde ilgili özellik bulunan kullanıcı için true döner.';

revoke all on function public.ozellige_erisim_var_mi(text) from public, anon;
grant execute on function public.ozellige_erisim_var_mi(text) to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'kullanici_profilleri', 'uyelik_paketleri', 'paket_donemleri', 'ozellikler',
    'paket_ozellikleri', 'banka_hesaplari', 'odeme_bildirimleri', 'abonelikler',
    'yonetim_islem_kayitlari'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
  end loop;
end;
$$;

create policy profil_kendi_okuma on public.kullanici_profilleri
for select to authenticated using (id = auth.uid() or public.admin_mi());
create policy profil_kendi_guncelleme on public.kullanici_profilleri
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profil_admin_yonetim on public.kullanici_profilleri
for all to authenticated using (public.admin_mi()) with check (public.admin_mi());

create policy paketler_okuma on public.uyelik_paketleri
for select to authenticated using (aktif_mi or public.admin_mi());
create policy paketler_admin_yonetim on public.uyelik_paketleri
for all to authenticated using (public.admin_mi()) with check (public.admin_mi());
create policy donemler_okuma on public.paket_donemleri
for select to authenticated using (aktif_mi or public.admin_mi());
create policy donemler_admin_yonetim on public.paket_donemleri
for all to authenticated using (public.admin_mi()) with check (public.admin_mi());
create policy ozellikler_okuma on public.ozellikler
for select to authenticated using (aktif_mi or public.admin_mi());
create policy ozellikler_admin_yonetim on public.ozellikler
for all to authenticated using (public.admin_mi()) with check (public.admin_mi());
create policy paket_ozellikleri_okuma on public.paket_ozellikleri
for select to authenticated using (true);
create policy paket_ozellikleri_admin_yonetim on public.paket_ozellikleri
for all to authenticated using (public.admin_mi()) with check (public.admin_mi());
create policy banka_hesaplari_okuma on public.banka_hesaplari
for select to authenticated using (aktif_mi or public.admin_mi());
create policy banka_hesaplari_admin_yonetim on public.banka_hesaplari
for all to authenticated using (public.admin_mi()) with check (public.admin_mi());
create policy odemeler_kendi_okuma on public.odeme_bildirimleri
for select to authenticated using (kullanici_id = auth.uid() or public.admin_mi());
create policy odemeler_admin_yonetim on public.odeme_bildirimleri
for all to authenticated using (public.admin_mi()) with check (public.admin_mi());
create policy abonelikler_kendi_okuma on public.abonelikler
for select to authenticated using (kullanici_id = auth.uid() or public.admin_mi());
create policy abonelikler_admin_yonetim on public.abonelikler
for all to authenticated using (public.admin_mi()) with check (public.admin_mi());
create policy yonetim_kayitlari_admin_okuma on public.yonetim_islem_kayitlari
for select to authenticated using (public.admin_mi());

do $$
declare
  v_table text;
  v_feature text;
begin
  foreach v_table in array array[
    'kurumlar', 'kaynak_kataloglari', 'kitap_aileleri', 'fasikuller',
    'yayinlar', 'belgeler', 'yayin_belgeleri', 'pozlar', 'poz_surumleri',
    'fiyatlar', 'tarifler', 'gider_notlari', 'analiz_satirlari',
    'guncelleme_endeksleri', 'birim_sozlugu', 'aktarim_calismalari'
  ] loop
    execute format('drop policy if exists owner_select on public.%I', v_table);
    execute format('drop policy if exists owner_insert on public.%I', v_table);
    execute format('drop policy if exists owner_update on public.%I', v_table);
    execute format('drop policy if exists owner_delete on public.%I', v_table);
    execute format('drop policy if exists admin_yonetim on public.%I', v_table);
    execute format(
      'create policy admin_yonetim on public.%I for all to authenticated using (public.admin_mi()) with check (public.admin_mi())',
      v_table
    );
  end loop;

  foreach v_table in array array[
    'kurumlar', 'kaynak_kataloglari', 'kitap_aileleri', 'fasikuller',
    'yayinlar', 'belgeler', 'yayin_belgeleri', 'pozlar',
    'birim_sozlugu', 'aktarim_calismalari'
  ] loop
    execute format(
      'create policy uyelik_okuma on public.%I for select to authenticated using (public.katalog_sahibi_mi(sahip_id) and public.ozellige_erisim_var_mi(''poz_temel''))',
      v_table
    );
  end loop;
end;
$$;

create policy uyelik_okuma on public.poz_surumleri
for select to authenticated using (
  public.katalog_sahibi_mi(sahip_id)
  and public.ozellige_erisim_var_mi('poz_temel')
  and exists (
    select 1 from public.aktarim_calismalari ac
    where ac.id = poz_surumleri.aktarim_id and ac.durum = 'complete'
  )
);

create policy uyelik_fiyat_okuma on public.fiyatlar
for select to authenticated using (
  public.katalog_sahibi_mi(sahip_id)
  and public.ozellige_erisim_var_mi('poz_fiyatlar')
  and exists (
    select 1 from public.aktarim_calismalari ac
    where ac.id = fiyatlar.aktarim_id and ac.durum = 'complete'
  )
);
create policy uyelik_analiz_okuma on public.tarifler
for select to authenticated using (
  public.katalog_sahibi_mi(sahip_id) and public.ozellige_erisim_var_mi('poz_analizleri')
);
create policy uyelik_analiz_okuma on public.gider_notlari
for select to authenticated using (
  public.katalog_sahibi_mi(sahip_id) and public.ozellige_erisim_var_mi('poz_analizleri')
);
create policy uyelik_analiz_okuma on public.analiz_satirlari
for select to authenticated using (
  public.katalog_sahibi_mi(sahip_id) and public.ozellige_erisim_var_mi('poz_analizleri')
);
create policy uyelik_analiz_okuma on public.guncelleme_endeksleri
for select to authenticated using (
  public.katalog_sahibi_mi(sahip_id) and public.ozellige_erisim_var_mi('poz_analizleri')
);

grant select, insert, update, delete on public.kullanici_profilleri,
  public.uyelik_paketleri, public.paket_donemleri, public.ozellikler,
  public.paket_ozellikleri, public.banka_hesaplari, public.odeme_bildirimleri,
  public.abonelikler, public.yonetim_islem_kayitlari to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant insert, update, delete on public.aktarim_calismalari to authenticated;

create or replace function public.odeme_bildirimi_olustur(
  p_paket_donemi_id uuid,
  p_banka_hesabi_id uuid,
  p_dekont_yolu text,
  p_aciklama text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_donem public.paket_donemleri%rowtype;
  v_id uuid;
begin
  if v_user is null then raise exception 'Oturum açmanız gerekiyor'; end if;
  select * into v_donem from public.paket_donemleri
  where id = p_paket_donemi_id and aktif_mi and fiyat is not null;
  if not found then raise exception 'Seçilen paket dönemi satış için aktif değil'; end if;
  if not exists (select 1 from public.banka_hesaplari where id = p_banka_hesabi_id and aktif_mi) then
    raise exception 'Seçilen banka hesabı aktif değil';
  end if;
  if p_dekont_yolu not like v_user::text || '/%' then
    raise exception 'Dekont yolu kullanıcı klasörüyle başlamalıdır';
  end if;
  insert into public.odeme_bildirimleri(
    kullanici_id, paket_donemi_id, banka_hesabi_id, tutar, para_birimi,
    dekont_yolu, kullanici_aciklamasi
  ) values (
    v_user, v_donem.id, p_banka_hesabi_id, v_donem.fiyat,
    v_donem.para_birimi, p_dekont_yolu, nullif(btrim(p_aciklama), '')
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_odeme_onayla(p_odeme_id uuid, p_admin_notu text default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin uuid := auth.uid();
  v_odeme record;
  v_baslangic timestamptz := now();
  v_bitis timestamptz;
  v_abonelik_id uuid;
begin
  if not public.admin_mi() then raise exception 'Admin yetkisi gerekiyor'; end if;
  select ob.*, pd.paket_id, pd.sure_ay
  into v_odeme
  from public.odeme_bildirimleri ob
  join public.paket_donemleri pd on pd.id = ob.paket_donemi_id
  where ob.id = p_odeme_id
  for update of ob;
  if not found then raise exception 'Ödeme bildirimi bulunamadı'; end if;
  if v_odeme.durum <> 'bekliyor' then raise exception 'Ödeme daha önce incelenmiş'; end if;

  select greatest(now(), max(a.bitis_zamani)) into v_baslangic
  from public.abonelikler a
  where a.kullanici_id = v_odeme.kullanici_id
    and a.paket_id = v_odeme.paket_id
    and a.durum = 'aktif'
    and a.bitis_zamani > now();
  v_baslangic := coalesce(v_baslangic, now());
  v_bitis := v_baslangic + make_interval(months => v_odeme.sure_ay);

  update public.abonelikler
  set durum = 'sona_erdi', guncellenme_zamani = now()
  where kullanici_id = v_odeme.kullanici_id
    and durum = 'aktif'
    and paket_id <> v_odeme.paket_id;

  insert into public.abonelikler(
    kullanici_id, paket_id, paket_donemi_id, odeme_bildirimi_id,
    baslangic_zamani, bitis_zamani, durum, olusturan_admin_id
  ) values (
    v_odeme.kullanici_id, v_odeme.paket_id, v_odeme.paket_donemi_id,
    v_odeme.id, v_baslangic, v_bitis, 'aktif', v_admin
  ) returning id into v_abonelik_id;

  update public.odeme_bildirimleri
  set durum = 'onaylandi', admin_notu = nullif(btrim(p_admin_notu), ''),
      inceleyen_admin_id = v_admin, incelenme_zamani = now(), guncellenme_zamani = now()
  where id = p_odeme_id;

  insert into public.yonetim_islem_kayitlari(admin_id, islem, hedef_turu, hedef_id)
  values (v_admin, 'odeme_onaylandi', 'odeme_bildirimi', p_odeme_id::text);
  return v_abonelik_id;
end;
$$;

create or replace function public.admin_odeme_reddet(p_odeme_id uuid, p_admin_notu text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_admin uuid := auth.uid();
begin
  if not public.admin_mi() then raise exception 'Admin yetkisi gerekiyor'; end if;
  if btrim(coalesce(p_admin_notu, '')) = '' then raise exception 'Red gerekçesi zorunludur'; end if;
  update public.odeme_bildirimleri
  set durum = 'reddedildi', admin_notu = btrim(p_admin_notu),
      inceleyen_admin_id = v_admin, incelenme_zamani = now(), guncellenme_zamani = now()
  where id = p_odeme_id and durum = 'bekliyor';
  if not found then raise exception 'Bekleyen ödeme bildirimi bulunamadı'; end if;
  insert into public.yonetim_islem_kayitlari(admin_id, islem, hedef_turu, hedef_id)
  values (v_admin, 'odeme_reddedildi', 'odeme_bildirimi', p_odeme_id::text);
end;
$$;

create or replace function public.admin_kaynak_yayini_kaydet(p_veri jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin uuid := auth.uid();
  v_kurum uuid;
  v_katalog uuid;
  v_kitap uuid;
  v_fasikul uuid;
  v_yayin uuid;
  v_dis_id text;
begin
  if not public.admin_mi() then raise exception 'Admin yetkisi gerekiyor'; end if;
  if jsonb_typeof(p_veri) <> 'object' then raise exception 'Kaynak verisi nesne olmalıdır'; end if;

  insert into public.kurumlar(sahip_id, kod, ad, resmi_ad, resmi_url)
  values (v_admin, upper(btrim(p_veri->>'kurum_kodu')), btrim(p_veri->>'kurum_adi'),
          nullif(btrim(p_veri->>'kurum_resmi_adi'), ''), nullif(btrim(p_veri->>'kurum_url'), ''))
  on conflict (sahip_id, kod) do update
  set ad = excluded.ad, resmi_ad = excluded.resmi_ad, resmi_url = excluded.resmi_url,
      guncellenme_zamani = now()
  returning id into v_kurum;

  insert into public.kaynak_kataloglari(
    sahip_id, kurum_id, katalog_anahtari, ad, kaynak_sayfasi_url, hak_durumu
  ) values (
    v_admin, v_kurum, upper(btrim(p_veri->>'katalog_anahtari')),
    btrim(p_veri->>'katalog_adi'), btrim(p_veri->>'kaynak_sayfasi_url'),
    coalesce(nullif(p_veri->>'hak_durumu', ''), 'review_required')
  ) on conflict (sahip_id, katalog_anahtari) do update
  set kurum_id = excluded.kurum_id, ad = excluded.ad,
      kaynak_sayfasi_url = excluded.kaynak_sayfasi_url,
      hak_durumu = excluded.hak_durumu, guncellenme_zamani = now()
  returning id into v_katalog;

  insert into public.kitap_aileleri(sahip_id, kurum_id, aile_anahtari, ad, disiplin)
  values (
    v_admin, v_kurum, upper(btrim(p_veri->>'kitap_anahtari')),
    btrim(p_veri->>'kitap_adi'), nullif(btrim(p_veri->>'disiplin'), '')
  ) on conflict (sahip_id, aile_anahtari) do update
  set kurum_id = excluded.kurum_id, ad = excluded.ad, disiplin = excluded.disiplin,
      guncellenme_zamani = now()
  returning id into v_kitap;

  if nullif(btrim(p_veri->>'fasikul_adi'), '') is not null then
    insert into public.fasikuller(sahip_id, kitap_ailesi_id, ad_ham, ad_normalize)
    values (v_admin, v_kitap, btrim(p_veri->>'fasikul_adi'), lower(btrim(p_veri->>'fasikul_adi')))
    on conflict (sahip_id, kitap_ailesi_id, ad_normalize) do update
    set ad_ham = excluded.ad_ham, guncellenme_zamani = now()
    returning id into v_fasikul;
  end if;

  v_dis_id := coalesce(
    nullif(btrim(p_veri->>'dis_kayit_id'), ''),
    upper(btrim(p_veri->>'katalog_anahtari')) || ':' ||
    coalesce(p_veri->>'yil', '0') || ':' || coalesce(p_veri->>'ay', '0') || ':' ||
    coalesce(p_veri->>'revizyon', '0') || ':' || upper(btrim(p_veri->>'kitap_anahtari'))
  );

  select id into v_yayin from public.yayinlar
  where sahip_id = v_admin and dis_kayit_id = v_dis_id;
  if v_yayin is null then
    insert into public.yayinlar(
      sahip_id, kurum_id, kaynak_katalogu_id, kitap_ailesi_id, dis_kayit_id,
      baslik, yayin_turu, donem_etiketi_ham, donem_yili, donem_ayi,
      donem_revizyonu, kaynak_sayfasi_url, dogrudan_belge_url,
      erisim_sinifi, hak_durumu
    ) values (
      v_admin, v_kurum, v_katalog, v_kitap, v_dis_id,
      btrim(p_veri->>'yayin_basligi'), coalesce(nullif(p_veri->>'yayin_turu', ''), 'unit_price_book'),
      btrim(p_veri->>'donem_etiketi'), nullif(p_veri->>'yil', '')::smallint,
      nullif(p_veri->>'ay', '')::smallint, nullif(p_veri->>'revizyon', '')::smallint,
      btrim(p_veri->>'kaynak_sayfasi_url'), nullif(btrim(p_veri->>'belge_url'), ''),
      'public', coalesce(nullif(p_veri->>'hak_durumu', ''), 'review_required')
    ) returning id into v_yayin;
  else
    update public.yayinlar set
      baslik = btrim(p_veri->>'yayin_basligi'),
      donem_etiketi_ham = btrim(p_veri->>'donem_etiketi'),
      dogrudan_belge_url = nullif(btrim(p_veri->>'belge_url'), ''),
      guncellenme_zamani = now()
    where id = v_yayin;
  end if;

  insert into public.yonetim_islem_kayitlari(admin_id, islem, hedef_turu, hedef_id)
  values (v_admin, 'kaynak_yayini_kaydedildi', 'yayin', v_yayin::text);
  return jsonb_build_object(
    'kurum_id', v_kurum, 'kaynak_katalogu_id', v_katalog,
    'kitap_ailesi_id', v_kitap, 'fasikul_id', v_fasikul, 'yayin_id', v_yayin
  );
end;
$$;

create or replace function public.admin_poz_aktarimini_baslat(
  p_yayin_id uuid,
  p_fasikul_id uuid,
  p_belge_url text,
  p_dosya_adi text,
  p_kaynak_bicimi text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_admin uuid := auth.uid();
  v_yayin public.yayinlar%rowtype;
  v_belge uuid;
  v_yayin_belgesi uuid;
  v_aktarim uuid;
begin
  if not public.admin_mi() then raise exception 'Admin yetkisi gerekiyor'; end if;
  select * into v_yayin from public.yayinlar where id = p_yayin_id and sahip_id = v_admin;
  if not found then raise exception 'Yayın bulunamadı'; end if;
  if p_fasikul_id is not null and not exists (
    select 1 from public.fasikuller where id = p_fasikul_id and sahip_id = v_admin
      and kitap_ailesi_id = v_yayin.kitap_ailesi_id
  ) then raise exception 'Fasikül yayın kitabı ile uyuşmuyor'; end if;

  select id into v_belge from public.belgeler
  where sahip_id = v_admin and kaynak_url = p_belge_url
  order by olusturulma_zamani desc limit 1;
  if v_belge is null then
    insert into public.belgeler(
      sahip_id, kaynak_url, ozgun_dosya_adi, kaynak_bicimi, hak_durumu
    ) values (
      v_admin, p_belge_url, nullif(btrim(p_dosya_adi), ''),
      nullif(lower(btrim(p_kaynak_bicimi)), ''), v_yayin.hak_durumu
    ) returning id into v_belge;
  end if;

  select id into v_yayin_belgesi from public.yayin_belgeleri
  where sahip_id = v_admin and yayin_id = p_yayin_id and belge_id = v_belge;
  if v_yayin_belgesi is null then
    insert into public.yayin_belgeleri(sahip_id, yayin_id, belge_id, belge_rolu)
    values (v_admin, p_yayin_id, v_belge, 'primary')
    on conflict (sahip_id, yayin_id) where belge_rolu = 'primary'
    do update set belge_id = excluded.belge_id, guncellenme_zamani = now()
    returning id into v_yayin_belgesi;
  end if;

  insert into public.aktarim_calismalari(
    sahip_id, kaynak_katalogu_id, yayin_id, aktarim_turu,
    ayristirici_adi, ayristirici_surumu, durum, baslama_zamani,
    gorulen_belge_sayisi, parametreler
  ) values (
    v_admin, v_yayin.kaynak_katalogu_id, p_yayin_id, 'position_import',
    'ekap-admin-panel', '1.0.0', 'running', now(), 1,
    jsonb_build_object('fasikul_id', p_fasikul_id, 'source_document_id', v_belge)
  ) returning id into v_aktarim;

  return jsonb_build_object(
    'aktarim_id', v_aktarim, 'belge_id', v_belge,
    'yayin_belgesi_id', v_yayin_belgesi
  );
end;
$$;

create or replace function public.admin_poz_aktarim_satirlarini_ekle(
  p_aktarim_id uuid,
  p_satirlar jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_admin uuid := auth.uid();
  v_run public.aktarim_calismalari%rowtype;
  v_yayin public.yayinlar%rowtype;
  v_belge_id uuid;
  v_yayin_belgesi_id uuid;
  v_fasikul_id uuid;
  v_row jsonb;
  v_poz uuid;
  v_surum uuid;
  v_ham_id bigint;
  v_kod text;
  v_tanim text;
  v_birim text;
  v_sayfa integer;
  v_satir integer;
  v_eklenen integer := 0;
  v_fiyat_sayisi integer := 0;
begin
  if not public.admin_mi() then raise exception 'Admin yetkisi gerekiyor'; end if;
  if jsonb_typeof(p_satirlar) <> 'array' then raise exception 'Satırlar dizi olmalıdır'; end if;
  if jsonb_array_length(p_satirlar) < 1 or jsonb_array_length(p_satirlar) > 500 then
    raise exception 'Her istekte 1 ile 500 satır gönderilmelidir';
  end if;

  select * into v_run from public.aktarim_calismalari
  where id = p_aktarim_id and sahip_id = v_admin for update;
  if not found or v_run.durum <> 'running' then raise exception 'Aktif aktarım bulunamadı'; end if;
  select * into v_yayin from public.yayinlar where id = v_run.yayin_id and sahip_id = v_admin;
  v_belge_id := (v_run.parametreler->>'source_document_id')::uuid;
  v_fasikul_id := nullif(v_run.parametreler->>'fasikul_id', '')::uuid;
  select id into v_yayin_belgesi_id from public.yayin_belgeleri
  where sahip_id = v_admin and yayin_id = v_yayin.id and belge_id = v_belge_id;

  for v_row in select value from jsonb_array_elements(p_satirlar)
  loop
    v_kod := btrim(v_row->>'poz');
    v_tanim := btrim(v_row->>'description');
    v_birim := nullif(btrim(v_row->>'unit'), '');
    v_sayfa := greatest(coalesce(nullif(v_row->>'page', '')::integer, 1), 1);
    v_satir := nullif(v_row->>'source_row', '')::integer;
    if v_kod = '' or v_tanim = '' then raise exception 'Poz ve açıklama zorunludur'; end if;
    if exists (
      select 1 from public.poz_surumleri ps
      join public.pozlar p on p.id = ps.poz_id and p.sahip_id = ps.sahip_id
      where ps.sahip_id = v_admin and ps.yayin_id = v_yayin.id
        and p.kod_normalize = upper(regexp_replace(v_kod, '\s+', '', 'g'))
    ) then raise exception 'Bu yayında poz zaten var: %', v_kod; end if;

    insert into private.ham_satirlar(
      sahip_id, aktarim_id, yayin_id, yayin_belgesi_id, belge_id,
      kaynak_sayfa, kaynak_tablo, kaynak_satir, satir_sha256,
      ham_veri, ayristirma_durumu
    ) values (
      v_admin, v_run.id, v_yayin.id, v_yayin_belgesi_id, v_belge_id,
      v_sayfa, nullif(v_row->>'source_table', ''), v_satir,
      encode(digest(convert_to(v_row::text, 'UTF8'), 'sha256'), 'hex'),
      v_row, 'accepted'
    ) returning id into v_ham_id;

    insert into public.pozlar(
      sahip_id, kurum_id, kitap_ailesi_id, kod_ham, kod_normalize, durum
    ) values (
      v_admin, v_yayin.kurum_id, v_yayin.kitap_ailesi_id,
      v_kod, upper(regexp_replace(v_kod, '\s+', '', 'g')), 'active'
    ) on conflict (sahip_id, kitap_ailesi_id, kod_normalize) do update
    set kod_ham = excluded.kod_ham, durum = 'active', guncellenme_zamani = now()
    returning id into v_poz;

    insert into public.poz_surumleri(
      sahip_id, kurum_id, kitap_ailesi_id, poz_id, yayin_id, fasikul_id,
      kayit_turu, kod_ham_anlik, eski_kod_ham, eski_kod_normalize,
      tanim_ham, tanim_normalize, tanim_on_eki, tanim_son_eki,
      birim_ham, fasikul_ham, kategori_ham, alt_kategori_ham,
      satin_alma_yeri, notlar, sira_no, aktarim_id, ham_satir_id,
      kaynak_belge_id, kaynak_sayfa, kaynak_tablo, kaynak_satir, ham_veri
    ) values (
      v_admin, v_yayin.kurum_id, v_yayin.kitap_ailesi_id, v_poz, v_yayin.id, v_fasikul_id,
      coalesce(nullif(v_row->>'record_type', ''), 'unit_price'), v_kod,
      nullif(v_row->>'old_poz', ''), nullif(upper(regexp_replace(v_row->>'old_poz', '\s+', '', 'g')), ''),
      v_tanim, lower(v_tanim), nullif(v_row->>'description_prefix', ''),
      nullif(v_row->>'description_suffix', ''), v_birim,
      nullif(v_row->>'fascicle', ''), nullif(v_row->>'category', ''),
      nullif(v_row->>'sub_category', ''), nullif(v_row->>'buy_place', ''),
      nullif(v_row->>'note', ''), v_satir, v_run.id, v_ham_id,
      v_belge_id, v_sayfa, nullif(v_row->>'source_table', ''), v_satir, v_row
    ) returning id into v_surum;

    if nullif(v_row->>'unit_price', '') is not null then
      insert into public.fiyatlar(
        sahip_id, poz_surumu_id, fiyat_turu, tutar_ham, tutar,
        aktarim_id, ham_satir_id, kaynak_belge_id, kaynak_sayfa
      ) values (v_admin, v_surum, 'unit_price', v_row->>'unit_price',
        (v_row->>'unit_price')::numeric, v_run.id, v_ham_id, v_belge_id, v_sayfa);
      v_fiyat_sayisi := v_fiyat_sayisi + 1;
    end if;
    if nullif(v_row->>'montage_price', '') is not null then
      insert into public.fiyatlar(
        sahip_id, poz_surumu_id, fiyat_turu, tutar_ham, tutar,
        aktarim_id, ham_satir_id, kaynak_belge_id, kaynak_sayfa
      ) values (v_admin, v_surum, 'montage_price', v_row->>'montage_price',
        (v_row->>'montage_price')::numeric, v_run.id, v_ham_id, v_belge_id, v_sayfa);
      v_fiyat_sayisi := v_fiyat_sayisi + 1;
    end if;
    if nullif(v_row->>'demontage_price', '') is not null then
      insert into public.fiyatlar(
        sahip_id, poz_surumu_id, fiyat_turu, tutar_ham, tutar,
        aktarim_id, ham_satir_id, kaynak_belge_id, kaynak_sayfa
      ) values (v_admin, v_surum, 'demontage_price', v_row->>'demontage_price',
        (v_row->>'demontage_price')::numeric, v_run.id, v_ham_id, v_belge_id, v_sayfa);
      v_fiyat_sayisi := v_fiyat_sayisi + 1;
    end if;
    v_eklenen := v_eklenen + 1;
  end loop;

  update public.aktarim_calismalari set
    gorulen_ham_satir_sayisi = gorulen_ham_satir_sayisi + v_eklenen,
    islenen_poz_sayisi = islenen_poz_sayisi + v_eklenen,
    islenen_surum_sayisi = islenen_surum_sayisi + v_eklenen,
    islenen_fiyat_sayisi = islenen_fiyat_sayisi + v_fiyat_sayisi,
    guncellenme_zamani = now()
  where id = v_run.id;
  return jsonb_build_object('eklenen', v_eklenen, 'fiyatlar', v_fiyat_sayisi);
end;
$$;

create or replace function public.admin_poz_aktarimini_tamamla(p_aktarim_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare v_admin uuid := auth.uid(); v_run public.aktarim_calismalari%rowtype;
begin
  if not public.admin_mi() then raise exception 'Admin yetkisi gerekiyor'; end if;
  select * into v_run from public.aktarim_calismalari
  where id = p_aktarim_id and sahip_id = v_admin for update;
  if not found or v_run.durum <> 'running' then raise exception 'Aktif aktarım bulunamadı'; end if;
  if v_run.islenen_surum_sayisi < 1 then raise exception 'Boş aktarım tamamlanamaz'; end if;
  update public.aktarim_calismalari
  set durum = 'complete', tamamlanma_zamani = now(), guncellenme_zamani = now()
  where id = p_aktarim_id;
  insert into public.yonetim_islem_kayitlari(admin_id, islem, hedef_turu, hedef_id, detay)
  values (v_admin, 'poz_aktarimi_tamamlandi', 'aktarim', p_aktarim_id::text,
    jsonb_build_object('satir', v_run.islenen_surum_sayisi, 'fiyat', v_run.islenen_fiyat_sayisi));
  return jsonb_build_object('aktarim_id', p_aktarim_id, 'durum', 'complete');
end;
$$;

create or replace function public.admin_poz_aktarimini_iptal_et(
  p_aktarim_id uuid,
  p_gerekce text default 'Admin tarafından iptal edildi'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_admin uuid := auth.uid();
begin
  if not public.admin_mi() then raise exception 'Admin yetkisi gerekiyor'; end if;
  if not exists (
    select 1 from public.aktarim_calismalari
    where id = p_aktarim_id and sahip_id = v_admin and durum in ('running', 'failed', 'needs_review')
  ) then raise exception 'İptal edilebilir aktarım bulunamadı'; end if;

  delete from public.fiyatlar where sahip_id = v_admin and aktarim_id = p_aktarim_id;
  delete from public.tarifler where sahip_id = v_admin and aktarim_id = p_aktarim_id;
  delete from public.gider_notlari where sahip_id = v_admin and aktarim_id = p_aktarim_id;
  delete from public.analiz_satirlari where sahip_id = v_admin and aktarim_id = p_aktarim_id;
  delete from public.guncelleme_endeksleri where sahip_id = v_admin and aktarim_id = p_aktarim_id;
  delete from public.poz_surumleri where sahip_id = v_admin and aktarim_id = p_aktarim_id;
  delete from private.ayristirma_hatalari where sahip_id = v_admin and aktarim_id = p_aktarim_id;
  delete from private.ham_satirlar where sahip_id = v_admin and aktarim_id = p_aktarim_id;

  update public.aktarim_calismalari
  set durum = 'stopped', tamamlanma_zamani = now(),
      parametreler = parametreler || jsonb_build_object('iptal_gerekcesi', left(p_gerekce, 1000)),
      guncellenme_zamani = now()
  where id = p_aktarim_id;

  insert into public.yonetim_islem_kayitlari(admin_id, islem, hedef_turu, hedef_id, detay)
  values (v_admin, 'poz_aktarimi_iptal_edildi', 'aktarim', p_aktarim_id::text,
    jsonb_build_object('gerekce', left(p_gerekce, 1000)));
end;
$$;

revoke all on function public.odeme_bildirimi_olustur(uuid, uuid, text, text) from public, anon;
revoke all on function public.admin_odeme_onayla(uuid, text) from public, anon;
revoke all on function public.admin_odeme_reddet(uuid, text) from public, anon;
revoke all on function public.admin_kaynak_yayini_kaydet(jsonb) from public, anon;
revoke all on function public.admin_poz_aktarimini_baslat(uuid, uuid, text, text, text) from public, anon;
revoke all on function public.admin_poz_aktarim_satirlarini_ekle(uuid, jsonb) from public, anon;
revoke all on function public.admin_poz_aktarimini_tamamla(uuid) from public, anon;
revoke all on function public.admin_poz_aktarimini_iptal_et(uuid, text) from public, anon;
grant execute on function public.odeme_bildirimi_olustur(uuid, uuid, text, text) to authenticated;
grant execute on function public.admin_odeme_onayla(uuid, text) to authenticated;
grant execute on function public.admin_odeme_reddet(uuid, text) to authenticated;
grant execute on function public.admin_kaynak_yayini_kaydet(jsonb) to authenticated;
grant execute on function public.admin_poz_aktarimini_baslat(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.admin_poz_aktarim_satirlarini_ekle(uuid, jsonb) to authenticated;
grant execute on function public.admin_poz_aktarimini_tamamla(uuid) to authenticated;
grant execute on function public.admin_poz_aktarimini_iptal_et(uuid, text) to authenticated;

revoke execute on function public.kisisel_calisma_alanini_hazirla() from authenticated;
revoke execute on function public.poz_aktarimini_tamamla(uuid, text) from authenticated;
revoke execute on function public.poz_aktarimini_durdur(uuid, text) from authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'odeme-dekontlari', 'odeme-dekontlari', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists dekont_kendi_yukleme on storage.objects;
drop policy if exists dekont_kendi_okuma on storage.objects;
drop policy if exists dekont_kendi_silme on storage.objects;
drop policy if exists dekont_admin_okuma on storage.objects;
create policy dekont_kendi_yukleme on storage.objects
for insert to authenticated with check (
  bucket_id = 'odeme-dekontlari' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy dekont_kendi_okuma on storage.objects
for select to authenticated using (
  bucket_id = 'odeme-dekontlari' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy dekont_kendi_silme on storage.objects
for delete to authenticated using (
  bucket_id = 'odeme-dekontlari' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy dekont_admin_okuma on storage.objects
for select to authenticated using (
  bucket_id = 'odeme-dekontlari' and public.admin_mi()
);

commit;
