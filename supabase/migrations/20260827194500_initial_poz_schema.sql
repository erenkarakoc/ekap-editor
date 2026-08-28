begin;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
do $$
declare
  v_extension_schema text;
begin
  select n.nspname
  into v_extension_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if v_extension_schema is distinct from 'extensions' then
    raise exception
      'pg_trgm must be installed in the extensions schema; current schema: %',
      coalesce(v_extension_schema, '<not installed>');
  end if;
end;
$$;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.guncellenme_zamani = now();
  return new;
end;
$$;
create table public.kurumlar (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kod text not null,
  ad text not null,
  resmi_ad text,
  resmi_url text,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint institutions_code_not_blank check (btrim(kod) <> ''),
  constraint institutions_name_not_blank check (btrim(ad) <> ''),
  constraint institutions_owner_id_id_key unique (sahip_id, id),
  constraint institutions_owner_code_key unique (sahip_id, kod)
);
create table public.kaynak_kataloglari (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kurum_id uuid not null,
  katalog_anahtari text not null,
  ad text not null,
  kaynak_sayfasi_url text not null,
  kaynak_turu text not null default 'official_publication',
  hak_durumu text not null default 'review_required',
  aktif_mi boolean not null default true,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint source_catalogs_owner_id_id_key unique (sahip_id, id),
  constraint source_catalogs_owner_institution_id_key unique (sahip_id, kurum_id, id),
  constraint source_catalogs_owner_catalog_key_key unique (sahip_id, katalog_anahtari),
  constraint source_catalogs_owner_institution_fk
    foreign key (sahip_id, kurum_id)
    references public.kurumlar(sahip_id, id) on delete cascade,
  constraint source_catalogs_text_not_blank check (
    btrim(katalog_anahtari) <> '' and btrim(ad) <> '' and btrim(kaynak_turu) <> ''
  ),
  constraint source_catalogs_landing_https check (kaynak_sayfasi_url ~ '^https://'),
  constraint source_catalogs_rights_status_check check (
    hak_durumu in (
      'personal_research_allowed',
      'review_required',
      'written_permission_required',
      'licensed_manual_export_only'
    )
  )
);
create table public.kitap_aileleri (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kurum_id uuid not null,
  aile_anahtari text not null,
  ad text not null,
  disiplin text,
  aciklama text,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint book_families_owner_id_id_key unique (sahip_id, id),
  constraint book_families_owner_institution_id_key unique (sahip_id, kurum_id, id),
  constraint book_families_owner_family_key_key unique (sahip_id, aile_anahtari),
  constraint book_families_owner_institution_fk
    foreign key (sahip_id, kurum_id)
    references public.kurumlar(sahip_id, id) on delete cascade,
  constraint book_families_text_not_blank check (
    btrim(aile_anahtari) <> '' and btrim(ad) <> ''
  )
);
create table public.fasikuller (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kitap_ailesi_id uuid not null,
  ad_ham text not null,
  ad_normalize text not null,
  sira_no integer,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint fascicles_owner_id_id_key unique (sahip_id, id),
  constraint fascicles_owner_family_id_key unique (sahip_id, kitap_ailesi_id, id),
  constraint fascicles_owner_family_name_key unique (sahip_id, kitap_ailesi_id, ad_normalize),
  constraint fascicles_owner_book_family_fk
    foreign key (sahip_id, kitap_ailesi_id)
    references public.kitap_aileleri(sahip_id, id) on delete cascade,
  constraint fascicles_text_not_blank check (
    btrim(ad_ham) <> '' and btrim(ad_normalize) <> ''
  ),
  constraint fascicles_sort_order_check check (sira_no is null or sira_no >= 0)
);
create table public.yayinlar (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kurum_id uuid not null,
  kaynak_katalogu_id uuid not null,
  kitap_ailesi_id uuid,
  dis_kayit_id text,
  baslik text not null,
  yayin_turu text not null,
  donem_etiketi_ham text not null,
  donem_yili smallint,
  donem_ayi smallint,
  donem_revizyonu smallint,
  donem_sirasi integer generated always as (
    coalesce(donem_yili::integer, 0) * 10000
    + coalesce(donem_ayi::integer, 0) * 100
    + coalesce(donem_revizyonu::integer, 0)
  ) stored,
  baski_varyanti text,
  dil_kodu text not null default 'tr',
  yayim_tarihi date,
  gecerlilik_baslangici date,
  gecerlilik_sonu date,
  kaynak_sayfasi_url text not null,
  dogrudan_belge_url text,
  erisim_sinifi text not null,
  hak_durumu text not null,
  ust_veri jsonb not null default '{}'::jsonb,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint publications_owner_id_id_key unique (sahip_id, id),
  constraint publications_owner_scope_id_key unique (
    sahip_id, kurum_id, kitap_ailesi_id, id
  ),
  constraint publications_owner_institution_fk
    foreign key (sahip_id, kurum_id)
    references public.kurumlar(sahip_id, id) on delete no action deferrable initially deferred,
  constraint publications_owner_catalog_scope_fk
    foreign key (sahip_id, kurum_id, kaynak_katalogu_id)
    references public.kaynak_kataloglari(sahip_id, kurum_id, id) on delete no action deferrable initially deferred,
  constraint publications_owner_family_scope_fk
    foreign key (sahip_id, kurum_id, kitap_ailesi_id)
    references public.kitap_aileleri(sahip_id, kurum_id, id) on delete no action deferrable initially deferred,
  constraint publications_period_year_check check (donem_yili is null or donem_yili between 1900 and 2200),
  constraint publications_period_month_check check (donem_ayi is null or donem_ayi between 1 and 12),
  constraint publications_period_revision_check check (donem_revizyonu is null or donem_revizyonu between 0 and 99),
  constraint publications_period_dependencies_check check (
    donem_yili is not null or (donem_ayi is null and donem_revizyonu is null)
  ),
  constraint publications_text_not_blank check (
    btrim(baslik) <> '' and btrim(yayin_turu) <> ''
    and btrim(donem_etiketi_ham) <> '' and btrim(erisim_sinifi) <> ''
    and btrim(hak_durumu) <> ''
  ),
  constraint publications_metadata_object_check check (jsonb_typeof(ust_veri) = 'object'),
  constraint publications_validity_check check (gecerlilik_sonu is null or gecerlilik_baslangici is null or gecerlilik_sonu >= gecerlilik_baslangici),
  constraint publications_landing_https check (kaynak_sayfasi_url ~ '^https://'),
  constraint publications_direct_https check (dogrudan_belge_url is null or dogrudan_belge_url ~ '^https://'),
  constraint publications_language_code_check check (dil_kodu ~ '^[a-z]{2}(-[A-Z]{2})?$')
);
create unique index publications_owner_external_manifest_key
  on public.yayinlar(sahip_id, dis_kayit_id)
  where dis_kayit_id is not null;
create table public.belgeler (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kaynak_url text not null,
  ozgun_dosya_adi text,
  kaynak_bicimi text,
  mime_turu text,
  bayt_boyutu bigint,
  sayfa_sayisi integer,
  sha256 text,
  depolama_kovasi text,
  depolama_yolu text,
  etag text,
  son_degistirilme text,
  alinma_zamani timestamptz,
  hak_durumu text not null,
  ust_veri jsonb not null default '{}'::jsonb,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint documents_owner_id_id_key unique (sahip_id, id),
  constraint documents_source_https check (kaynak_url ~ '^https://'),
  constraint documents_byte_size_check check (bayt_boyutu is null or bayt_boyutu >= 0),
  constraint documents_page_count_check check (sayfa_sayisi is null or sayfa_sayisi >= 1),
  constraint documents_sha256_check check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  constraint documents_rights_not_blank check (btrim(hak_durumu) <> ''),
  constraint documents_metadata_object_check check (jsonb_typeof(ust_veri) = 'object'),
  constraint documents_storage_pair_check check (
    (depolama_kovasi is null and depolama_yolu is null)
    or (depolama_kovasi is not null and depolama_yolu is not null)
  ),
  constraint documents_storage_owner_prefix_check check (
    depolama_yolu is null or depolama_yolu like sahip_id::text || '/%'
  )
);
create unique index documents_owner_sha256_key
  on public.belgeler(sahip_id, sha256)
  where sha256 is not null;
create unique index documents_owner_storage_path_key
  on public.belgeler(sahip_id, depolama_kovasi, depolama_yolu)
  where depolama_yolu is not null;
create table public.yayin_belgeleri (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  yayin_id uuid not null,
  belge_id uuid not null,
  belge_rolu text not null default 'primary',
  sira_no integer not null default 0,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint publication_documents_owner_id_id_key unique (sahip_id, id),
  constraint publication_documents_owner_scope_id_key unique (
    sahip_id, id, yayin_id, belge_id
  ),
  constraint publication_documents_owner_relation_key unique (
    sahip_id, yayin_id, belge_id, belge_rolu
  ),
  constraint publication_documents_owner_publication_fk
    foreign key (sahip_id, yayin_id)
    references public.yayinlar(sahip_id, id) on delete cascade,
  constraint publication_documents_owner_document_fk
    foreign key (sahip_id, belge_id)
    references public.belgeler(sahip_id, id) on delete cascade,
  constraint publication_documents_role_check check (
    belge_rolu in ('primary', 'supplement', 'analysis', 'tariff', 'revision', 'index', 'other')
  ),
  constraint publication_documents_sort_order_check check (sira_no >= 0)
);
create unique index publication_documents_one_primary_key
  on public.yayin_belgeleri(sahip_id, yayin_id)
  where belge_rolu = 'primary';
create table public.pozlar (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kurum_id uuid not null,
  kitap_ailesi_id uuid not null,
  kod_ham text not null,
  kod_normalize text not null,
  durum text not null default 'active',
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint positions_owner_id_id_key unique (sahip_id, id),
  constraint positions_owner_scope_id_key unique (
    sahip_id, kurum_id, kitap_ailesi_id, id
  ),
  constraint positions_owner_family_code_key unique (sahip_id, kitap_ailesi_id, kod_normalize),
  constraint positions_owner_institution_fk
    foreign key (sahip_id, kurum_id)
    references public.kurumlar(sahip_id, id) on delete no action deferrable initially deferred,
  constraint positions_owner_family_scope_fk
    foreign key (sahip_id, kurum_id, kitap_ailesi_id)
    references public.kitap_aileleri(sahip_id, kurum_id, id) on delete no action deferrable initially deferred,
  constraint positions_code_not_blank check (btrim(kod_ham) <> '' and btrim(kod_normalize) <> ''),
  constraint positions_status_check check (durum in ('active', 'inactive', 'superseded', 'unknown'))
);
create table public.poz_surumleri (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kurum_id uuid not null,
  kitap_ailesi_id uuid not null,
  poz_id uuid not null,
  yayin_id uuid not null,
  fasikul_id uuid,
  kayit_turu text not null default 'unit_price',
  kod_ham_anlik text not null,
  tanim_ham text not null,
  tanim_normalize text not null,
  birim_ham text,
  birim_kodu text,
  fasikul_ham text,
  sira_no integer,
  gecerlilik_baslangici date,
  gecerlilik_sonu date,
  aktarim_id uuid not null,
  ham_satir_id bigint not null,
  kaynak_belge_id uuid not null,
  kaynak_sayfa integer not null,
  kaynak_tablo text,
  kaynak_satir integer,
  ham_veri jsonb not null default '{}'::jsonb,
  arama_vektoru tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(kod_ham_anlik, '') || ' ' ||
      coalesce(tanim_normalize, '') || ' ' ||
      coalesce(fasikul_ham, '') || ' ' ||
      coalesce(birim_ham, '')
    )
  ) stored,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint position_versions_owner_id_id_key unique (sahip_id, id),
  constraint position_versions_owner_position_publication_kind_key unique (
    sahip_id, poz_id, yayin_id, kayit_turu
  ),
  constraint position_versions_owner_position_scope_fk
    foreign key (sahip_id, kurum_id, kitap_ailesi_id, poz_id)
    references public.pozlar(sahip_id, kurum_id, kitap_ailesi_id, id) on delete cascade,
  constraint position_versions_owner_publication_scope_fk
    foreign key (sahip_id, kurum_id, kitap_ailesi_id, yayin_id)
    references public.yayinlar(sahip_id, kurum_id, kitap_ailesi_id, id) on delete no action deferrable initially deferred,
  constraint position_versions_owner_fascicle_scope_fk
    foreign key (sahip_id, kitap_ailesi_id, fasikul_id)
    references public.fasikuller(sahip_id, kitap_ailesi_id, id) on delete no action deferrable initially deferred,
  constraint position_versions_owner_document_fk
    foreign key (sahip_id, kaynak_belge_id)
    references public.belgeler(sahip_id, id) on delete no action deferrable initially deferred,
  constraint position_versions_raw_text_not_blank check (
    btrim(kod_ham_anlik) <> ''
    and btrim(tanim_ham) <> ''
    and btrim(tanim_normalize) <> ''
  ),
  constraint position_versions_record_kind_check check (
    kayit_turu in ('unit_price', 'rayic', 'karsiz', 'analysis_header', 'other')
  ),
  constraint position_versions_sequence_check check (sira_no is null or sira_no >= 0),
  constraint position_versions_source_page_check check (kaynak_sayfa >= 1),
  constraint position_versions_source_row_check check (kaynak_satir is null or kaynak_satir >= 1),
  constraint position_versions_raw_payload_check check (
    jsonb_typeof(ham_veri) = 'object' and ham_veri <> '{}'::jsonb
  ),
  constraint position_versions_validity_check check (gecerlilik_sonu is null or gecerlilik_baslangici is null or gecerlilik_sonu >= gecerlilik_baslangici)
);
create table public.fiyatlar (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  poz_surumu_id uuid not null,
  fiyat_turu text not null,
  tutar_ham text not null,
  tutar numeric(19,4) not null,
  para_birimi_kodu text not null default 'TRY',
  kar_dahil_mi boolean,
  kdv_dahil_mi boolean,
  genel_giderler_dahil_mi boolean,
  kar_orani numeric(9,6),
  gecerlilik_baslangici date,
  gecerlilik_sonu date,
  aktarim_id uuid not null,
  ham_satir_id bigint not null,
  kaynak_belge_id uuid not null,
  kaynak_sayfa integer not null,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint prices_owner_id_id_key unique (sahip_id, id),
  constraint prices_owner_version_kind_currency_key unique (
    sahip_id, poz_surumu_id, fiyat_turu, para_birimi_kodu
  ),
  constraint prices_owner_position_version_fk
    foreign key (sahip_id, poz_surumu_id)
    references public.poz_surumleri(sahip_id, id) on delete cascade,
  constraint prices_owner_document_fk
    foreign key (sahip_id, kaynak_belge_id)
    references public.belgeler(sahip_id, id) on delete no action deferrable initially deferred,
  constraint prices_amount_raw_not_blank check (btrim(tutar_ham) <> ''),
  constraint prices_amount_check check (tutar >= 0),
  constraint prices_currency_check check (para_birimi_kodu ~ '^[A-Z]{3}$'),
  constraint prices_profit_rate_check check (kar_orani is null or kar_orani between 0 and 1),
  constraint prices_source_page_check check (kaynak_sayfa >= 1),
  constraint prices_validity_check check (gecerlilik_sonu is null or gecerlilik_baslangici is null or gecerlilik_sonu >= gecerlilik_baslangici),
  constraint prices_price_kind_check check (
    fiyat_turu in ('unit_price', 'rayic', 'karsiz', 'component_unit_price', 'other')
  )
);
create table public.tarifler (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  poz_surumu_id uuid not null,
  tarif_ham text not null,
  tarif_normalize text not null,
  olcum_kurali_ham text,
  odeme_esasi_ham text,
  aktarim_id uuid not null,
  ham_satir_id bigint not null,
  kaynak_belge_id uuid not null,
  kaynak_sayfa integer not null,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint tariffs_owner_id_id_key unique (sahip_id, id),
  constraint tariffs_owner_position_version_key unique (sahip_id, poz_surumu_id),
  constraint tariffs_owner_position_version_fk
    foreign key (sahip_id, poz_surumu_id)
    references public.poz_surumleri(sahip_id, id) on delete cascade,
  constraint tariffs_owner_document_fk
    foreign key (sahip_id, kaynak_belge_id)
    references public.belgeler(sahip_id, id) on delete no action deferrable initially deferred,
  constraint tariffs_text_not_blank check (
    btrim(tarif_ham) <> '' and btrim(tarif_normalize) <> ''
  ),
  constraint tariffs_source_page_check check (kaynak_sayfa >= 1)
);
create table public.gider_notlari (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  poz_surumu_id uuid not null,
  not_turu text not null,
  not_ham text not null,
  aktarim_id uuid not null,
  ham_satir_id bigint not null,
  kaynak_belge_id uuid not null,
  kaynak_sayfa integer not null,
  sira_no integer not null default 0,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint expense_notes_owner_id_id_key unique (sahip_id, id),
  constraint expense_notes_owner_position_version_fk
    foreign key (sahip_id, poz_surumu_id)
    references public.poz_surumleri(sahip_id, id) on delete cascade,
  constraint expense_notes_owner_document_fk
    foreign key (sahip_id, kaynak_belge_id)
    references public.belgeler(sahip_id, id) on delete no action deferrable initially deferred,
  constraint expense_notes_text_not_blank check (btrim(not_ham) <> ''),
  constraint expense_notes_kind_check check (not_turu in ('included', 'excluded', 'other')),
  constraint expense_notes_source_page_check check (kaynak_sayfa >= 1),
  constraint expense_notes_sort_order_check check (sira_no >= 0)
);
create table public.analiz_satirlari (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ana_poz_surumu_id uuid not null,
  satir_no integer not null,
  bilesen_poz_id uuid,
  bilesen_kodu_ham text,
  bilesen_kodu_normalize text,
  bilesen_tanimi_ham text not null,
  bilesen_tanimi_normalize text not null,
  bilesen_turu text,
  birim_ham text,
  birim_kodu text,
  miktar_ham text,
  miktar numeric(18,6),
  birim_fiyat_ham text,
  birim_fiyat numeric(19,4),
  satir_toplami_ham text,
  satir_toplami numeric(19,4),
  para_birimi_kodu text not null default 'TRY',
  aktarim_id uuid not null,
  ham_satir_id bigint not null,
  kaynak_belge_id uuid not null,
  kaynak_sayfa integer not null,
  kaynak_tablo text,
  ham_veri jsonb not null default '{}'::jsonb,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint analysis_lines_owner_id_id_key unique (sahip_id, id),
  constraint analysis_lines_owner_version_line_no_key unique (
    sahip_id, ana_poz_surumu_id, satir_no
  ),
  constraint analysis_lines_owner_position_version_fk
    foreign key (sahip_id, ana_poz_surumu_id)
    references public.poz_surumleri(sahip_id, id) on delete cascade,
  constraint analysis_lines_owner_component_position_fk
    foreign key (sahip_id, bilesen_poz_id)
    references public.pozlar(sahip_id, id) on delete no action deferrable initially deferred,
  constraint analysis_lines_owner_document_fk
    foreign key (sahip_id, kaynak_belge_id)
    references public.belgeler(sahip_id, id) on delete no action deferrable initially deferred,
  constraint analysis_lines_description_not_blank check (
    btrim(bilesen_tanimi_ham) <> ''
    and btrim(bilesen_tanimi_normalize) <> ''
  ),
  constraint analysis_lines_line_no_check check (satir_no >= 1),
  constraint analysis_lines_quantity_check check (miktar is null or miktar >= 0),
  constraint analysis_lines_unit_price_check check (birim_fiyat is null or birim_fiyat >= 0),
  constraint analysis_lines_line_total_check check (satir_toplami is null or satir_toplami >= 0),
  constraint analysis_lines_currency_check check (para_birimi_kodu ~ '^[A-Z]{3}$'),
  constraint analysis_lines_source_page_check check (kaynak_sayfa >= 1),
  constraint analysis_lines_raw_payload_check check (
    jsonb_typeof(ham_veri) = 'object' and ham_veri <> '{}'::jsonb
  )
);
create table public.poz_iliskileri (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kaynak_poz_id uuid not null,
  hedef_poz_id uuid,
  hedef_kurum_kodu text,
  hedef_kitap_ailesi_anahtari text,
  hedef_kod_ham text,
  hedef_kod_normalize text,
  iliski_turu text not null,
  resmi_mi boolean not null default true,
  guven_orani numeric(5,4),
  yayin_id uuid,
  aktarim_id uuid,
  ham_satir_id bigint,
  kaynak_belge_id uuid,
  kaynak_sayfa integer,
  notlar text,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint position_relations_owner_id_id_key unique (sahip_id, id),
  constraint position_relations_owner_source_position_fk
    foreign key (sahip_id, kaynak_poz_id)
    references public.pozlar(sahip_id, id) on delete cascade,
  constraint position_relations_owner_target_position_fk
    foreign key (sahip_id, hedef_poz_id)
    references public.pozlar(sahip_id, id) on delete no action deferrable initially deferred,
  constraint position_relations_owner_publication_fk
    foreign key (sahip_id, yayin_id)
    references public.yayinlar(sahip_id, id) on delete no action deferrable initially deferred,
  constraint position_relations_owner_document_fk
    foreign key (sahip_id, kaynak_belge_id)
    references public.belgeler(sahip_id, id) on delete no action deferrable initially deferred,
  constraint position_relations_target_check check (
    hedef_poz_id is not null or btrim(coalesce(hedef_kod_ham, '')) <> ''
  ),
  constraint position_relations_type_check check (
    iliski_turu in (
      'equivalent', 'supersedes', 'superseded_by', 'uses', 'used_by',
      'added', 'removed', 'changed', 'official_related'
    )
  ),
  constraint position_relations_confidence_check check (guven_orani is null or guven_orani between 0 and 1),
  constraint position_relations_source_page_check check (kaynak_sayfa is null or kaynak_sayfa >= 1),
  constraint position_relations_provenance_check check (
    (
      aktarim_id is null and ham_satir_id is null
      and kaynak_belge_id is null and kaynak_sayfa is null
    )
    or (
      yayin_id is not null and aktarim_id is not null and ham_satir_id is not null
      and kaynak_belge_id is not null and kaynak_sayfa is not null
    )
  ),
  constraint position_relations_official_provenance_check check (
    not resmi_mi
    or (
      yayin_id is not null and aktarim_id is not null and ham_satir_id is not null
      and kaynak_belge_id is not null and kaynak_sayfa is not null
    )
  )
);
create table public.guncelleme_endeksleri (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  poz_surumu_id uuid not null,
  endeks_kodu_ham text not null,
  endeks_kodu_normalize text not null,
  endeks_tanimi_ham text,
  aktarim_id uuid not null,
  ham_satir_id bigint not null,
  kaynak_belge_id uuid not null,
  kaynak_sayfa integer not null,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint update_indices_owner_id_id_key unique (sahip_id, id),
  constraint update_indices_owner_version_code_key unique (
    sahip_id, poz_surumu_id, endeks_kodu_normalize
  ),
  constraint update_indices_owner_position_version_fk
    foreign key (sahip_id, poz_surumu_id)
    references public.poz_surumleri(sahip_id, id) on delete cascade,
  constraint update_indices_owner_document_fk
    foreign key (sahip_id, kaynak_belge_id)
    references public.belgeler(sahip_id, id) on delete no action deferrable initially deferred,
  constraint update_indices_text_not_blank check (
    btrim(endeks_kodu_ham) <> '' and btrim(endeks_kodu_normalize) <> ''
  ),
  constraint update_indices_source_page_check check (kaynak_sayfa >= 1)
);
create table public.revizyonlar (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  poz_id uuid,
  yayin_id uuid not null,
  revizyon_turu text not null,
  revizyon_metni_ham text not null,
  yururluk_tarihi date,
  aktarim_id uuid not null,
  ham_satir_id bigint not null,
  kaynak_belge_id uuid not null,
  kaynak_sayfa integer not null,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint revisions_owner_id_id_key unique (sahip_id, id),
  constraint revisions_owner_position_fk
    foreign key (sahip_id, poz_id)
    references public.pozlar(sahip_id, id) on delete cascade,
  constraint revisions_owner_publication_fk
    foreign key (sahip_id, yayin_id)
    references public.yayinlar(sahip_id, id) on delete cascade,
  constraint revisions_owner_document_fk
    foreign key (sahip_id, kaynak_belge_id)
    references public.belgeler(sahip_id, id) on delete no action deferrable initially deferred,
  constraint revisions_text_not_blank check (btrim(revizyon_metni_ham) <> ''),
  constraint revisions_type_check check (
    revizyon_turu in ('added', 'removed', 'changed', 'corrected', 'renamed', 'other')
  ),
  constraint revisions_source_page_check check (kaynak_sayfa >= 1)
);
create table public.birim_sozlugu (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  birim_ham text not null,
  birim_kodu text not null,
  gorunen_ad text not null,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint unit_dictionary_owner_id_id_key unique (sahip_id, id),
  constraint unit_dictionary_owner_raw_key unique (sahip_id, birim_ham),
  constraint unit_dictionary_owner_code_raw_key unique (sahip_id, birim_kodu, birim_ham),
  constraint unit_dictionary_text_not_blank check (
    btrim(birim_ham) <> '' and btrim(birim_kodu) <> '' and btrim(gorunen_ad) <> ''
  )
);
create table public.aktarim_calismalari (
  id uuid primary key default gen_random_uuid(),
  sahip_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kaynak_katalogu_id uuid not null,
  yayin_id uuid,
  aktarim_turu text not null,
  ayristirici_adi text not null,
  ayristirici_surumu text not null,
  durum text not null default 'planned',
  baslama_zamani timestamptz,
  tamamlanma_zamani timestamptz,
  gorulen_belge_sayisi integer not null default 0,
  gorulen_ham_satir_sayisi integer not null default 0,
  islenen_poz_sayisi integer not null default 0,
  islenen_surum_sayisi integer not null default 0,
  islenen_fiyat_sayisi integer not null default 0,
  uyari_sayisi integer not null default 0,
  hata_sayisi integer not null default 0,
  parametreler jsonb not null default '{}'::jsonb,
  olusturulma_zamani timestamptz not null default now(),
  guncellenme_zamani timestamptz not null default now(),
  constraint ingestion_runs_owner_id_id_key unique (sahip_id, id),
  constraint ingestion_runs_owner_publication_id_key unique (sahip_id, id, yayin_id),
  constraint ingestion_runs_owner_source_catalog_fk
    foreign key (sahip_id, kaynak_katalogu_id)
    references public.kaynak_kataloglari(sahip_id, id) on delete no action deferrable initially deferred,
  constraint ingestion_runs_owner_publication_fk
    foreign key (sahip_id, yayin_id)
    references public.yayinlar(sahip_id, id) on delete no action deferrable initially deferred,
  constraint ingestion_runs_status_check check (
    durum in ('planned', 'running', 'complete', 'failed', 'stopped', 'needs_review')
  ),
  constraint ingestion_runs_text_not_blank check (
    btrim(aktarim_turu) <> '' and btrim(ayristirici_adi) <> '' and btrim(ayristirici_surumu) <> ''
  ),
  constraint ingestion_runs_time_check check (
    tamamlanma_zamani is null or baslama_zamani is null or tamamlanma_zamani >= baslama_zamani
  ),
  constraint ingestion_runs_parameters_object_check check (jsonb_typeof(parametreler) = 'object'),
  constraint ingestion_runs_counts_check check (
    gorulen_belge_sayisi >= 0 and gorulen_ham_satir_sayisi >= 0 and islenen_poz_sayisi >= 0
    and islenen_surum_sayisi >= 0 and islenen_fiyat_sayisi >= 0
    and uyari_sayisi >= 0 and hata_sayisi >= 0
  )
);
create table private.kaynak_liste_kayitlari (
  sahip_id uuid not null references auth.users(id) on delete cascade,
  liste_belge_id text not null,
  kurum_anahtari text not null,
  baslik text not null,
  donem_ham text,
  belge_turu text,
  kaynak_sayfasi_url text not null,
  belge_url text,
  kaynak_bicimi text,
  erisim_sinifi text not null,
  indirme_politikasi text not null,
  hak_notu text,
  kesif_tarihi date not null,
  kayit_json jsonb not null,
  aktarilma_zamani timestamptz not null default now(),
  primary key (sahip_id, liste_belge_id),
  constraint source_manifest_records_landing_https check (kaynak_sayfasi_url ~ '^https://'),
  constraint source_manifest_records_document_https check (belge_url is null or belge_url ~ '^https://'),
  constraint source_manifest_records_json_object check (jsonb_typeof(kayit_json) = 'object')
);
create table private.ham_satirlar (
  id bigint generated always as identity primary key,
  sahip_id uuid not null references auth.users(id) on delete cascade,
  aktarim_id uuid not null,
  yayin_id uuid not null,
  yayin_belgesi_id uuid not null,
  belge_id uuid not null,
  kaynak_sayfa integer not null,
  kaynak_tablo text,
  kaynak_satir integer,
  satir_sha256 text not null,
  ham_veri jsonb not null,
  ayristirma_durumu text not null default 'pending',
  olusturulma_zamani timestamptz not null default now(),
  constraint raw_rows_owner_id_id_key unique (sahip_id, id),
  constraint raw_rows_owner_run_key unique (sahip_id, id, aktarim_id),
  constraint raw_rows_owner_lineage_key unique (
    sahip_id, id, aktarim_id, belge_id
  ),
  constraint raw_rows_owner_run_publication_fk
    foreign key (sahip_id, aktarim_id, yayin_id)
    references public.aktarim_calismalari(sahip_id, id, yayin_id) on delete no action deferrable initially deferred,
  constraint raw_rows_owner_publication_document_fk
    foreign key (sahip_id, yayin_belgesi_id, yayin_id, belge_id)
    references public.yayin_belgeleri(sahip_id, id, yayin_id, belge_id)
    on delete no action deferrable initially deferred,
  constraint raw_rows_owner_coordinate_key unique nulls not distinct (
    sahip_id, aktarim_id, belge_id, kaynak_sayfa,
    kaynak_tablo, kaynak_satir
  ),
  constraint raw_rows_page_check check (kaynak_sayfa >= 1),
  constraint raw_rows_row_check check (kaynak_satir is null or kaynak_satir >= 1),
  constraint raw_rows_sha256_check check (satir_sha256 ~ '^[0-9a-f]{64}$'),
  constraint raw_rows_payload_object check (
    jsonb_typeof(ham_veri) = 'object' and ham_veri <> '{}'::jsonb
  ),
  constraint raw_rows_status_check check (
    ayristirma_durumu in ('pending', 'accepted', 'rejected', 'needs_review')
  )
);
create table private.ayristirma_hatalari (
  id bigint generated always as identity primary key,
  sahip_id uuid not null references auth.users(id) on delete cascade,
  aktarim_id uuid not null,
  ham_satir_id bigint,
  hata_kodu text not null,
  hata_mesaji text not null,
  baglam jsonb not null default '{}'::jsonb,
  olusturulma_zamani timestamptz not null default now(),
  constraint parse_errors_owner_ingestion_run_fk
    foreign key (sahip_id, aktarim_id)
    references public.aktarim_calismalari(sahip_id, id) on delete cascade,
  constraint parse_errors_owner_raw_row_fk
    foreign key (sahip_id, ham_satir_id, aktarim_id)
    references private.ham_satirlar(sahip_id, id, aktarim_id) on delete cascade,
  constraint parse_errors_text_not_blank check (
    btrim(hata_kodu) <> '' and btrim(hata_mesaji) <> ''
  ),
  constraint parse_errors_context_object_check check (jsonb_typeof(baglam) = 'object')
);
alter table public.poz_surumleri
  add constraint position_versions_raw_row_lineage_fk
  foreign key (sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id)
  references private.ham_satirlar(sahip_id, id, aktarim_id, belge_id)
  on delete no action deferrable initially deferred;
alter table public.fiyatlar
  add constraint prices_raw_row_lineage_fk
  foreign key (sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id)
  references private.ham_satirlar(sahip_id, id, aktarim_id, belge_id)
  on delete no action deferrable initially deferred;
alter table public.tarifler
  add constraint tariffs_raw_row_lineage_fk
  foreign key (sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id)
  references private.ham_satirlar(sahip_id, id, aktarim_id, belge_id)
  on delete no action deferrable initially deferred;
alter table public.gider_notlari
  add constraint expense_notes_raw_row_lineage_fk
  foreign key (sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id)
  references private.ham_satirlar(sahip_id, id, aktarim_id, belge_id)
  on delete no action deferrable initially deferred;
alter table public.analiz_satirlari
  add constraint analysis_lines_raw_row_lineage_fk
  foreign key (sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id)
  references private.ham_satirlar(sahip_id, id, aktarim_id, belge_id)
  on delete no action deferrable initially deferred;
alter table public.poz_iliskileri
  add constraint position_relations_raw_row_lineage_fk
  foreign key (sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id)
  references private.ham_satirlar(sahip_id, id, aktarim_id, belge_id)
  on delete no action deferrable initially deferred;
alter table public.guncelleme_endeksleri
  add constraint update_indices_raw_row_lineage_fk
  foreign key (sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id)
  references private.ham_satirlar(sahip_id, id, aktarim_id, belge_id)
  on delete no action deferrable initially deferred;
alter table public.revizyonlar
  add constraint revisions_raw_row_lineage_fk
  foreign key (sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id)
  references private.ham_satirlar(sahip_id, id, aktarim_id, belge_id)
  on delete no action deferrable initially deferred;
create or replace function private.enforce_position_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_family_institution_id uuid;
begin
  if tg_op = 'UPDATE' then
    if (
         old.sahip_id is distinct from new.sahip_id
         or old.kurum_id is distinct from new.kurum_id
         or old.kitap_ailesi_id is distinct from new.kitap_ailesi_id
         or old.kod_ham is distinct from new.kod_ham
         or old.kod_normalize is distinct from new.kod_normalize
       )
       and exists (
         select 1
         from public.poz_surumleri pv
         where pv.sahip_id = old.sahip_id
           and pv.poz_id = old.id
       ) then
      raise exception using
        errcode = '23514',
        message = 'Position owner, scope and codes are immutable after a version exists';
    end if;
  end if;

  select bf.kurum_id
  into v_family_institution_id
  from public.kitap_aileleri bf
  where bf.sahip_id = new.sahip_id
    and bf.id = new.kitap_ailesi_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Position book family was not found in the same owner scope';
  end if;

  if v_family_institution_id <> new.kurum_id then
    raise exception using
      errcode = '23514',
      message = 'Position institution must match its book family institution';
  end if;

  return new;
end;
$$;
create or replace function private.enforce_publication_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_catalog_institution_id uuid;
  v_family_institution_id uuid;
begin
  if tg_op = 'UPDATE' then
    if (
       old.sahip_id is distinct from new.sahip_id
         or old.kurum_id is distinct from new.kurum_id
         or old.kaynak_katalogu_id is distinct from new.kaynak_katalogu_id
         or old.kitap_ailesi_id is distinct from new.kitap_ailesi_id
         or old.donem_yili is distinct from new.donem_yili
         or old.donem_ayi is distinct from new.donem_ayi
         or old.donem_revizyonu is distinct from new.donem_revizyonu
       )
       and (
         exists (
           select 1
           from public.poz_surumleri pv
           where pv.sahip_id = old.sahip_id
             and pv.yayin_id = old.id
         )
         or exists (
           select 1
           from public.aktarim_calismalari ir
           where ir.sahip_id = old.sahip_id
             and ir.yayin_id = old.id
         )
       ) then
      raise exception using
        errcode = '23514',
        message = 'Publication scope and period are immutable after import records exist';
    end if;
  end if;

  select sc.kurum_id
  into v_catalog_institution_id
  from public.kaynak_kataloglari sc
  where sc.sahip_id = new.sahip_id
    and sc.id = new.kaynak_katalogu_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Publication source catalog was not found in the same owner scope';
  end if;

  if v_catalog_institution_id <> new.kurum_id then
    raise exception using
      errcode = '23514',
      message = 'Publication institution must match its source catalog institution';
  end if;

  if new.kitap_ailesi_id is not null then
    select bf.kurum_id
    into v_family_institution_id
    from public.kitap_aileleri bf
    where bf.sahip_id = new.sahip_id
      and bf.id = new.kitap_ailesi_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'Publication book family was not found in the same owner scope';
    end if;

    if v_family_institution_id <> new.kurum_id then
      raise exception using
        errcode = '23514',
        message = 'Publication catalog and book family must belong to the same institution';
    end if;
  end if;

  return new;
end;
$$;
create or replace function private.enforce_raw_row_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'UPDATE' then
    if old.id is distinct from new.id
       or old.sahip_id is distinct from new.sahip_id
       or old.aktarim_id is distinct from new.aktarim_id
       or old.yayin_id is distinct from new.yayin_id
       or old.yayin_belgesi_id is distinct from new.yayin_belgesi_id
       or old.belge_id is distinct from new.belge_id
       or old.kaynak_sayfa is distinct from new.kaynak_sayfa
       or old.kaynak_tablo is distinct from new.kaynak_tablo
       or old.kaynak_satir is distinct from new.kaynak_satir
       or old.satir_sha256 is distinct from new.satir_sha256
       or old.ham_veri is distinct from new.ham_veri
       or old.olusturulma_zamani is distinct from new.olusturulma_zamani then
      raise exception using
        errcode = '23514',
        message = 'Raw source rows are immutable; only ayristirma_durumu may change';
    end if;
  end if;

  return new;
end;
$$;
create or replace function private.enforce_ingestion_run_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_publication_catalog_id uuid;
begin
  if tg_op = 'INSERT' and new.durum = 'complete' then
    raise exception using
      errcode = '23514',
      message = 'An ingestion run cannot be inserted as complete; use poz_aktarimini_tamamla';
  end if;

  if tg_op = 'UPDATE' then
    if old.durum = 'complete' then
      raise exception using
        errcode = '23514',
        message = 'A completed ingestion run is immutable';
    end if;

    if (
         old.sahip_id is distinct from new.sahip_id
         or old.kaynak_katalogu_id is distinct from new.kaynak_katalogu_id
         or old.yayin_id is distinct from new.yayin_id
       )
       and exists (
         select 1
         from private.ham_satirlar rr
         where rr.sahip_id = old.sahip_id
           and rr.aktarim_id = old.id
       ) then
      raise exception using
        errcode = '23514',
        message = 'Ingestion run catalog and publication are immutable after raw rows exist';
    end if;
  end if;

  if new.yayin_id is not null then
    select pub.kaynak_katalogu_id
    into v_publication_catalog_id
    from public.yayinlar pub
    where pub.sahip_id = new.sahip_id
      and pub.id = new.yayin_id;

    if not found or v_publication_catalog_id <> new.kaynak_katalogu_id then
      raise exception using
        errcode = '23514',
        message = 'Ingestion run publication must belong to its source catalog';
    end if;
  end if;

  return new;
end;
$$;
create or replace function private.enforce_position_version_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_raw_publication_id uuid;
  v_raw_source_page integer;
  v_raw_source_table text;
  v_raw_source_row integer;
begin
  select rr.yayin_id, rr.kaynak_sayfa, rr.kaynak_tablo, rr.kaynak_satir
  into v_raw_publication_id, v_raw_source_page, v_raw_source_table, v_raw_source_row
  from private.ham_satirlar rr
  where rr.sahip_id = new.sahip_id
    and rr.id = new.ham_satir_id
    and rr.aktarim_id = new.aktarim_id
    and rr.belge_id = new.kaynak_belge_id;

  if not found
     or v_raw_publication_id is distinct from new.yayin_id
     or v_raw_source_page is distinct from new.kaynak_sayfa
     or v_raw_source_table is distinct from new.kaynak_tablo
     or v_raw_source_row is distinct from new.kaynak_satir then
    raise exception using
      errcode = '23514',
      message = 'Position version must match the publication and source coordinates of its exact raw row';
  end if;

  return new;
end;
$$;
create or replace function private.enforce_fact_document_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_publication_id uuid;
  v_raw_publication_id uuid;
  v_raw_source_page integer;
  v_raw_source_table text;
begin
  if tg_table_name in ('fiyatlar', 'tarifler', 'gider_notlari', 'guncelleme_endeksleri') then
    select pv.yayin_id
    into v_publication_id
    from public.poz_surumleri pv
    where pv.sahip_id = new.sahip_id
      and pv.id = new.poz_surumu_id;
  elsif tg_table_name = 'analiz_satirlari' then
    select pv.yayin_id
    into v_publication_id
    from public.poz_surumleri pv
    where pv.sahip_id = new.sahip_id
      and pv.id = new.ana_poz_surumu_id;
  elsif tg_table_name in ('poz_iliskileri', 'revizyonlar') then
    v_publication_id := new.yayin_id;
  else
    raise exception using
      errcode = '23514',
      message = format('Unsupported fact table for document scope trigger: %s', tg_table_name);
  end if;

  if tg_table_name = 'poz_iliskileri' then
    if not new.resmi_mi and new.kaynak_belge_id is null then
      return new;
    end if;
  end if;

  if v_publication_id is null then
    raise exception using
      errcode = '23514',
      message = format('%s requires a publication-scoped source', tg_table_name);
  end if;

  select rr.yayin_id, rr.kaynak_sayfa, rr.kaynak_tablo
  into v_raw_publication_id, v_raw_source_page, v_raw_source_table
  from private.ham_satirlar rr
  where rr.sahip_id = new.sahip_id
    and rr.id = new.ham_satir_id
    and rr.aktarim_id = new.aktarim_id
    and rr.belge_id = new.kaynak_belge_id;

  if not found
     or v_raw_publication_id is distinct from v_publication_id
     or v_raw_source_page is distinct from new.kaynak_sayfa then
    raise exception using
      errcode = '23514',
      message = format(
        '%s must match the publication and page of its exact raw row',
        tg_table_name
      );
  end if;

  if tg_table_name = 'analiz_satirlari' then
    if v_raw_source_table is distinct from new.kaynak_tablo then
      raise exception using
        errcode = '23514',
        message = 'Analysis line source table must match its exact raw row';
    end if;
  end if;

  return new;
end;
$$;
create or replace function private.guard_completed_run_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_run record;
begin
  -- Allow the direct auth.users ON DELETE CASCADE cleanup path. During that
  -- cascade the parent Auth row is already absent in the deleting transaction.
  if tg_op = 'DELETE'
     and not exists (
       select 1 from auth.users u where u.id = old.sahip_id
     ) then
    return old;
  end if;

  if tg_op = 'INSERT' then
    for v_run in
      select ir.id, ir.durum
      from public.aktarim_calismalari ir
      where ir.sahip_id = new.sahip_id
        and ir.id = new.aktarim_id
      for key share
    loop
      if v_run.durum in ('needs_review', 'complete') then
        raise exception using
          errcode = '23514',
          message = 'QA-locked or completed ingestion run lineage is immutable';
      end if;
    end loop;
  elsif tg_op = 'DELETE' then
    for v_run in
      select ir.id, ir.durum
      from public.aktarim_calismalari ir
      where ir.sahip_id = old.sahip_id
        and ir.id = old.aktarim_id
      for key share
    loop
      if v_run.durum in ('needs_review', 'complete') then
        raise exception using
          errcode = '23514',
          message = 'QA-locked or completed ingestion run lineage is immutable';
      end if;
    end loop;
  else
    for v_run in
      select ir.id, ir.durum
      from public.aktarim_calismalari ir
      where (
          ir.sahip_id = old.sahip_id
          and ir.id = old.aktarim_id
        ) or (
          ir.sahip_id = new.sahip_id
          and ir.id = new.aktarim_id
        )
      order by ir.sahip_id, ir.id
      for key share
    loop
      if v_run.durum in ('needs_review', 'complete') then
        raise exception using
          errcode = '23514',
          message = 'QA-locked or completed ingestion run lineage is immutable';
      end if;
    end loop;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
create or replace function private.guard_completed_document_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_old_owner uuid;
  v_old_document uuid;
  v_new_owner uuid;
  v_new_document uuid;
  v_run record;
begin
  if tg_op = 'INSERT' then
    return new;
  end if;

  v_old_owner := old.sahip_id;
  v_old_document := old.id;
  if tg_op = 'UPDATE' then
    v_new_owner := new.sahip_id;
    v_new_document := new.id;
  end if;

  if tg_op = 'DELETE'
     and not exists (
       select 1 from auth.users u where u.id = v_old_owner
     ) then
    return old;
  end if;

  for v_run in
    select ir.id, ir.durum
    from public.aktarim_calismalari ir
    where exists (
      select 1
      from private.ham_satirlar rr
      where rr.sahip_id = ir.sahip_id
        and rr.aktarim_id = ir.id
        and (
          (rr.sahip_id = v_old_owner and rr.belge_id = v_old_document)
          or (rr.sahip_id = v_new_owner and rr.belge_id = v_new_document)
        )
    )
    order by ir.sahip_id, ir.id
    for key share
  loop
    if v_run.durum in ('needs_review', 'complete') then
      raise exception using
        errcode = '23514',
        message = 'A source document used by a QA-locked or completed run is immutable';
    end if;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
create or replace function private.guard_completed_publication_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_old_owner uuid;
  v_old_publication uuid;
  v_new_owner uuid;
  v_new_publication uuid;
  v_run record;
begin
  if tg_table_name = 'yayinlar' then
    if tg_op <> 'INSERT' then
      v_old_owner := old.sahip_id;
      v_old_publication := old.id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_owner := new.sahip_id;
      v_new_publication := new.id;
    end if;
  elsif tg_table_name = 'yayin_belgeleri' then
    if tg_op <> 'INSERT' then
      v_old_owner := old.sahip_id;
      v_old_publication := old.yayin_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_owner := new.sahip_id;
      v_new_publication := new.yayin_id;
    end if;
  else
    raise exception using
      errcode = '23514',
      message = format('Unsupported publication mutation table: %s', tg_table_name);
  end if;

  if tg_op = 'DELETE'
     and not exists (
       select 1 from auth.users u where u.id = v_old_owner
     ) then
    return old;
  end if;

  for v_run in
    select ir.id, ir.durum
    from public.aktarim_calismalari ir
    where (
        ir.sahip_id = v_old_owner
        and ir.yayin_id = v_old_publication
      ) or (
        ir.sahip_id = v_new_owner
        and ir.yayin_id = v_new_publication
      )
    order by ir.sahip_id, ir.id
    for key share
  loop
    if v_run.durum in ('needs_review', 'complete') then
      raise exception using
        errcode = '23514',
        message = 'A publication used by a QA-locked or completed run is immutable';
    end if;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
create or replace function private.guard_completed_run_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.durum = 'complete'
     and exists (
       select 1 from auth.users u where u.id = old.sahip_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'A completed ingestion run is immutable';
  end if;
  return old;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.enforce_position_scope() from public, anon, authenticated;
revoke all on function private.enforce_publication_scope() from public, anon, authenticated;
revoke all on function private.enforce_raw_row_scope() from public, anon, authenticated;
revoke all on function private.enforce_ingestion_run_scope() from public, anon, authenticated;
revoke all on function private.enforce_position_version_scope() from public, anon, authenticated;
revoke all on function private.enforce_fact_document_scope() from public, anon, authenticated;
revoke all on function private.guard_completed_run_mutation() from public, anon, authenticated;
revoke all on function private.guard_completed_document_mutation() from public, anon, authenticated;
revoke all on function private.guard_completed_publication_mutation() from public, anon, authenticated;
revoke all on function private.guard_completed_run_delete() from public, anon, authenticated;
create trigger enforce_position_scope
before insert or update on public.pozlar
for each row execute function private.enforce_position_scope();
create trigger enforce_publication_scope
before insert or update on public.yayinlar
for each row execute function private.enforce_publication_scope();
create trigger enforce_raw_row_scope
before insert or update on private.ham_satirlar
for each row execute function private.enforce_raw_row_scope();
create trigger enforce_ingestion_run_scope
before insert or update on public.aktarim_calismalari
for each row execute function private.enforce_ingestion_run_scope();
create trigger enforce_position_version_scope
before insert or update on public.poz_surumleri
for each row execute function private.enforce_position_version_scope();
create trigger enforce_price_document_scope
before insert or update on public.fiyatlar
for each row execute function private.enforce_fact_document_scope();
create trigger enforce_tariff_document_scope
before insert or update on public.tarifler
for each row execute function private.enforce_fact_document_scope();
create trigger enforce_expense_note_document_scope
before insert or update on public.gider_notlari
for each row execute function private.enforce_fact_document_scope();
create trigger enforce_analysis_line_document_scope
before insert or update on public.analiz_satirlari
for each row execute function private.enforce_fact_document_scope();
create trigger enforce_position_relation_document_scope
before insert or update on public.poz_iliskileri
for each row execute function private.enforce_fact_document_scope();
create trigger enforce_update_index_document_scope
before insert or update on public.guncelleme_endeksleri
for each row execute function private.enforce_fact_document_scope();
create trigger enforce_revision_document_scope
before insert or update on public.revizyonlar
for each row execute function private.enforce_fact_document_scope();
create trigger guard_completed_raw_row_mutation
before insert or update or delete on private.ham_satirlar
for each row execute function private.guard_completed_run_mutation();
create trigger guard_completed_parse_error_mutation
before insert or update or delete on private.ayristirma_hatalari
for each row execute function private.guard_completed_run_mutation();
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'poz_surumleri', 'fiyatlar', 'tarifler', 'gider_notlari',
    'analiz_satirlari', 'poz_iliskileri', 'guncelleme_endeksleri', 'revizyonlar'
  ]
  loop
    execute format(
      'create trigger guard_completed_run_mutation before insert or update or delete on public.%I for each row execute function private.guard_completed_run_mutation()',
      table_name
    );
  end loop;
end;
$$;
create trigger guard_completed_document_mutation
before update or delete on public.belgeler
for each row execute function private.guard_completed_document_mutation();
create trigger guard_completed_publication_mutation
before update or delete on public.yayinlar
for each row execute function private.guard_completed_publication_mutation();
create trigger guard_completed_publication_document_mutation
before insert or update or delete on public.yayin_belgeleri
for each row execute function private.guard_completed_publication_mutation();
create trigger guard_completed_ingestion_run_delete
before delete on public.aktarim_calismalari
for each row execute function private.guard_completed_run_delete();
create index publications_owner_period_idx on public.yayinlar(sahip_id, donem_sirasi desc);
create index publications_owner_catalog_type_idx on public.yayinlar(sahip_id, kaynak_katalogu_id, yayin_turu);
create index publications_owner_book_family_idx on public.yayinlar(sahip_id, kitap_ailesi_id);
create index documents_owner_retrieved_idx on public.belgeler(sahip_id, alinma_zamani);
create index publication_documents_owner_document_idx on public.yayin_belgeleri(sahip_id, belge_id);
create index positions_owner_institution_code_idx on public.pozlar(sahip_id, kurum_id, kod_normalize);
create index positions_code_trgm_idx on public.pozlar using gin (kod_normalize extensions.gin_trgm_ops);
create index position_versions_owner_publication_idx on public.poz_surumleri(sahip_id, yayin_id);
create index position_versions_owner_position_scope_idx
  on public.poz_surumleri(sahip_id, kurum_id, kitap_ailesi_id, poz_id);
create index position_versions_owner_publication_scope_idx
  on public.poz_surumleri(sahip_id, kurum_id, kitap_ailesi_id, yayin_id);
create index position_versions_owner_fascicle_scope_idx
  on public.poz_surumleri(sahip_id, kitap_ailesi_id, fasikul_id);
create index position_versions_owner_document_idx on public.poz_surumleri(sahip_id, kaynak_belge_id);
create index position_versions_owner_lineage_idx
  on public.poz_surumleri(sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id);
create index position_versions_search_idx on public.poz_surumleri using gin (arama_vektoru);
create index position_versions_description_trgm_idx
  on public.poz_surumleri using gin (tanim_normalize extensions.gin_trgm_ops);
create index prices_owner_document_idx on public.fiyatlar(sahip_id, kaynak_belge_id);
create index prices_owner_lineage_idx
  on public.fiyatlar(sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id);
create index tariffs_owner_document_idx on public.tarifler(sahip_id, kaynak_belge_id);
create index tariffs_owner_lineage_idx
  on public.tarifler(sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id);
create index expense_notes_owner_version_idx on public.gider_notlari(sahip_id, poz_surumu_id);
create index expense_notes_owner_document_idx on public.gider_notlari(sahip_id, kaynak_belge_id);
create index expense_notes_owner_lineage_idx
  on public.gider_notlari(sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id);
create index analysis_lines_owner_parent_idx on public.analiz_satirlari(sahip_id, ana_poz_surumu_id);
create index analysis_lines_owner_component_idx on public.analiz_satirlari(sahip_id, bilesen_poz_id);
create index analysis_lines_owner_document_idx on public.analiz_satirlari(sahip_id, kaynak_belge_id);
create index analysis_lines_owner_lineage_idx
  on public.analiz_satirlari(sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id);
create index position_relations_owner_source_idx on public.poz_iliskileri(sahip_id, kaynak_poz_id);
create index position_relations_owner_target_idx on public.poz_iliskileri(sahip_id, hedef_poz_id);
create index position_relations_owner_publication_idx on public.poz_iliskileri(sahip_id, yayin_id);
create index position_relations_owner_document_idx on public.poz_iliskileri(sahip_id, kaynak_belge_id);
create index position_relations_owner_lineage_idx
  on public.poz_iliskileri(sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id);
create index update_indices_owner_version_idx on public.guncelleme_endeksleri(sahip_id, poz_surumu_id);
create index update_indices_owner_document_idx on public.guncelleme_endeksleri(sahip_id, kaynak_belge_id);
create index update_indices_owner_lineage_idx
  on public.guncelleme_endeksleri(sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id);
create index revisions_owner_position_idx on public.revizyonlar(sahip_id, poz_id);
create index revisions_owner_publication_idx on public.revizyonlar(sahip_id, yayin_id);
create index revisions_owner_document_idx on public.revizyonlar(sahip_id, kaynak_belge_id);
create index revisions_owner_lineage_idx
  on public.revizyonlar(sahip_id, ham_satir_id, aktarim_id, kaynak_belge_id);
create index ingestion_runs_owner_status_idx on public.aktarim_calismalari(sahip_id, durum);
create index ingestion_runs_owner_catalog_idx on public.aktarim_calismalari(sahip_id, kaynak_katalogu_id);
create index ingestion_runs_owner_publication_idx on public.aktarim_calismalari(sahip_id, yayin_id);
create index source_manifest_records_owner_institution_idx
  on private.kaynak_liste_kayitlari(sahip_id, kurum_anahtari, donem_ham);
create index raw_rows_owner_status_idx on private.ham_satirlar(sahip_id, aktarim_id, ayristirma_durumu);
create index raw_rows_owner_document_idx on private.ham_satirlar(sahip_id, belge_id);
create index raw_rows_owner_publication_document_idx
  on private.ham_satirlar(sahip_id, yayin_belgesi_id, yayin_id, belge_id);
create index raw_rows_owner_hash_idx
  on private.ham_satirlar(sahip_id, aktarim_id, satir_sha256);
create index parse_errors_owner_run_idx on private.ayristirma_hatalari(sahip_id, aktarim_id);
create index parse_errors_owner_raw_row_idx on private.ayristirma_hatalari(sahip_id, ham_satir_id);
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'kurumlar', 'kaynak_kataloglari', 'kitap_aileleri', 'fasikuller',
    'yayinlar', 'belgeler', 'yayin_belgeleri', 'pozlar',
    'poz_surumleri', 'fiyatlar', 'tarifler', 'gider_notlari',
    'analiz_satirlari', 'poz_iliskileri', 'guncelleme_endeksleri', 'revizyonlar',
    'birim_sozlugu', 'aktarim_calismalari'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'create policy owner_select on public.%I for select to authenticated using (sahip_id = (select auth.uid()))',
      table_name
    );
    execute format(
      'create policy owner_insert on public.%I for insert to authenticated with check (sahip_id = (select auth.uid()))',
      table_name
    );
    execute format(
      'create policy owner_update on public.%I for update to authenticated using (sahip_id = (select auth.uid())) with check (sahip_id = (select auth.uid()))',
      table_name
    );
    execute format(
      'create policy owner_delete on public.%I for delete to authenticated using (sahip_id = (select auth.uid()))',
      table_name
    );
  end loop;
end;
$$;
revoke all on all tables in schema public from public, anon;
revoke all on all sequences in schema public from public, anon;
revoke all on schema public from public, anon, authenticated;
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke insert, update, delete on public.aktarim_calismalari from authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on all tables in schema private to service_role;
grant usage, select on all sequences in schema private to service_role;
alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema private
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema private
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema private
  grant usage, select on sequences to service_role;
alter default privileges for role postgres in schema private
  grant execute on functions to service_role;
create or replace function public.kisisel_calisma_alanini_hazirla()
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_yfk_institution uuid;
begin
  if v_owner is null then
    raise exception 'Authenticated user required';
  end if;

  insert into public.kurumlar(sahip_id, kod, ad, resmi_ad, resmi_url)
  values
    (v_owner, 'KGM', 'Karayolları Genel Müdürlüğü', 'Karayolları Genel Müdürlüğü', 'https://www.kgm.gov.tr/'),
    (v_owner, 'CSIDB_YFK', 'ÇŞİDB / Yüksek Fen Kurulu', 'Yüksek Fen Kurulu Başkanlığı', 'https://yfk.csb.gov.tr/'),
    (v_owner, 'MSB', 'Millî Savunma Bakanlığı', 'Millî Savunma Bakanlığı', 'https://www.msb.gov.tr/'),
    (v_owner, 'DSI', 'Devlet Su İşleri Genel Müdürlüğü', 'Devlet Su İşleri Genel Müdürlüğü', 'https://www.dsi.gov.tr/'),
    (v_owner, 'AYGM', 'Altyapı Yatırımları Genel Müdürlüğü', 'Altyapı Yatırımları Genel Müdürlüğü', 'https://aygm.uab.gov.tr/'),
    (v_owner, 'ILBANK', 'İller Bankası', 'İller Bankası A.Ş.', 'https://www.ilbank.gov.tr/'),
    (v_owner, 'PTT', 'PTT Genel Müdürlüğü', 'PTT A.Ş.', 'https://www.ptt.gov.tr/'),
    (v_owner, 'VGM', 'Vakıflar Genel Müdürlüğü', 'Vakıflar Genel Müdürlüğü', 'https://www.vgm.gov.tr/'),
    (v_owner, 'KVGM', 'Kültür Varlıkları ve Müzeler Genel Müdürlüğü', 'Kültür Varlıkları ve Müzeler Genel Müdürlüğü', 'https://kvmgm.ktb.gov.tr/'),
    (v_owner, 'TEDAS', 'TEDAŞ', 'Türkiye Elektrik Dağıtım A.Ş.', 'https://www.tedas.gov.tr/')
  on conflict (sahip_id, kod) do update
  set ad = excluded.ad,
      resmi_ad = excluded.resmi_ad,
      resmi_url = excluded.resmi_url,
      guncellenme_zamani = now();

  select id into v_yfk_institution
  from public.kurumlar
  where sahip_id = v_owner and kod = 'CSIDB_YFK';

  insert into public.kaynak_kataloglari(
    sahip_id, kurum_id, katalog_anahtari, ad, kaynak_sayfasi_url, hak_durumu
  )
  values
    (v_owner, v_yfk_institution, 'YFK_ANNUAL', 'YFK yıllık birim fiyatlar', 'https://yfk.csb.gov.tr/birim-fiyatlar-100468', 'review_required'),
    (v_owner, v_yfk_institution, 'YFK_MONTHLY', 'YFK aylık rayiç ve birim fiyat listeleri', 'https://yfk.csb.gov.tr/aylik-guncel-rayic-ve-birim-fiyat-listeleri-113351', 'review_required'),
    (v_owner, v_yfk_institution, 'YFK_ARCHIVE', 'YFK birim fiyat arşivi', 'https://yfk.csb.gov.tr/birim-fiyat-arsivi-91569', 'review_required')
  on conflict (sahip_id, katalog_anahtari) do update
  set ad = excluded.ad,
      kaynak_sayfasi_url = excluded.kaynak_sayfasi_url,
      guncellenme_zamani = now();

  insert into public.kitap_aileleri(sahip_id, kurum_id, aile_anahtari, ad, disiplin)
  values
    (v_owner, v_yfk_institution, 'YFK_MAIN', 'YFK Ana Birim Fiyat Kitabı', 'genel'),
    (v_owner, v_yfk_institution, 'YFK_CONSTRUCTION', 'YFK İnşaat Birim Fiyatları', 'inşaat'),
    (v_owner, v_yfk_institution, 'YFK_MECHANICAL', 'YFK Mekanik Tesisat Birim Fiyatları', 'mekanik'),
    (v_owner, v_yfk_institution, 'YFK_ELECTRICAL', 'YFK Elektrik Tesisatı Birim Fiyatları', 'elektrik')
  on conflict (sahip_id, aile_anahtari) do update
  set ad = excluded.ad,
      disiplin = excluded.disiplin,
      guncellenme_zamani = now();

  insert into public.birim_sozlugu(sahip_id, birim_ham, birim_kodu, gorunen_ad)
  values
    (v_owner, 'm', 'M', 'metre'),
    (v_owner, 'm²', 'M2', 'metrekare'),
    (v_owner, 'm2', 'M2', 'metrekare'),
    (v_owner, 'm³', 'M3', 'metreküp'),
    (v_owner, 'm3', 'M3', 'metreküp'),
    (v_owner, 'kg', 'KG', 'kilogram'),
    (v_owner, 'ton', 'TON', 'ton'),
    (v_owner, 'adet', 'ADET', 'adet'),
    (v_owner, 'saat', 'SAAT', 'saat')
  on conflict (sahip_id, birim_ham) do update
  set birim_kodu = excluded.birim_kodu,
      gorunen_ad = excluded.gorunen_ad;

  return jsonb_build_object(
    'sahip_id', v_owner,
    'kurumlar', (select count(*) from public.kurumlar where sahip_id = v_owner),
    'kaynak_kataloglari', (select count(*) from public.kaynak_kataloglari where sahip_id = v_owner),
    'kitap_aileleri', (select count(*) from public.kitap_aileleri where sahip_id = v_owner)
  );
end;
$$;
revoke all on function public.kisisel_calisma_alanini_hazirla() from public, anon;
grant execute on function public.kisisel_calisma_alanini_hazirla() to authenticated;
create or replace function public.poz_ara(
  arama_metni text,
  sonuc_siniri integer default 50
)
returns table (
  poz_id uuid,
  poz_surumu_id uuid,
  kurum_adi text,
  kitap_ailesi_adi text,
  kod_ham text,
  tanim_ham text,
  birim_ham text,
  donem_etiketi text,
  puan real
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select
    p.id,
    pv.id,
    i.ad,
    bf.ad,
    p.kod_ham,
    pv.tanim_ham,
    pv.birim_ham,
    pub.donem_etiketi_ham,
    greatest(
      ts_rank(pv.arama_vektoru, websearch_to_tsquery('simple'::regconfig, arama_metni)),
      extensions.similarity(p.kod_normalize, lower(arama_metni)),
      extensions.similarity(pv.tanim_normalize, lower(arama_metni))
    )::real as puan
  from public.pozlar p
  join public.poz_surumleri pv
    on pv.sahip_id = p.sahip_id and pv.poz_id = p.id
  join public.kurumlar i
    on i.sahip_id = p.sahip_id and i.id = p.kurum_id
  join public.kitap_aileleri bf
    on bf.sahip_id = p.sahip_id and bf.id = p.kitap_ailesi_id
  join public.yayinlar pub
    on pub.sahip_id = pv.sahip_id and pub.id = pv.yayin_id
  join public.aktarim_calismalari ir
    on ir.sahip_id = pv.sahip_id
   and ir.id = pv.aktarim_id
   and ir.durum = 'complete'
  where p.sahip_id = (select auth.uid())
    and btrim(arama_metni) <> ''
    and (
      pv.arama_vektoru @@ websearch_to_tsquery('simple'::regconfig, arama_metni)
      or p.kod_normalize operator(extensions.%) lower(arama_metni)
      or pv.tanim_normalize operator(extensions.%) lower(arama_metni)
    )
  order by puan desc, pub.donem_sirasi desc, p.kod_normalize
  limit least(greatest(coalesce(sonuc_siniri, 50), 1), 200);
$$;
revoke all on function public.poz_ara(text, integer) from public, anon;
grant execute on function public.poz_ara(text, integer) to authenticated;
create or replace function public.poz_aktarimini_tamamla(
  p_aktarim_id uuid,
  p_qa_onayi text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_owner uuid := auth.uid();
  v_run public.aktarim_calismalari%rowtype;
  v_documents bigint;
  v_raw_rows bigint;
  v_accepted_rows bigint;
  v_unresolved_rows bigint;
  v_positions bigint;
  v_versions bigint;
  v_prices bigint;
  v_errors bigint;
  v_coverage_errors bigint;
begin
  if v_owner is null then
    raise exception 'Authenticated user required';
  end if;

  if p_qa_onayi is distinct from 'QA_QUERIES_ALL_ZERO' then
    raise exception using
      errcode = '22023',
      message = 'Confirmation must be QA_QUERIES_ALL_ZERO';
  end if;

  select ir.*
  into v_run
  from public.aktarim_calismalari ir
  where ir.sahip_id = v_owner
    and ir.id = p_aktarim_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Ingestion run not found';
  end if;

  if v_run.durum <> 'needs_review' then
    raise exception using
      errcode = '23514',
      message = 'Only a needs_review ingestion run can be finalized';
  end if;

  if v_run.aktarim_turu <> 'position_import' then
    raise exception using
      errcode = '23514',
      message = 'This finalizer only accepts position_import runs';
  end if;

  if v_run.yayin_id is null
     or v_run.baslama_zamani is null
     or v_run.tamamlanma_zamani is null
     or v_run.tamamlanma_zamani < v_run.baslama_zamani then
    raise exception using
      errcode = '23514',
      message = 'Ingestion run publication and timestamps are incomplete';
  end if;

  select
    count(distinct rr.belge_id),
    count(*),
    count(*) filter (where rr.ayristirma_durumu = 'accepted'),
    count(*) filter (where rr.ayristirma_durumu <> 'accepted')
  into v_documents, v_raw_rows, v_accepted_rows, v_unresolved_rows
  from private.ham_satirlar rr
  where rr.sahip_id = v_owner
    and rr.aktarim_id = p_aktarim_id;

  select count(*)
  into v_errors
  from private.ayristirma_hatalari pe
  where pe.sahip_id = v_owner
    and pe.aktarim_id = p_aktarim_id;

  select count(distinct pv.poz_id), count(*)
  into v_positions, v_versions
  from public.poz_surumleri pv
  where pv.sahip_id = v_owner
    and pv.yayin_id = v_run.yayin_id
    and pv.aktarim_id = p_aktarim_id;

  select count(*)
  into v_prices
  from public.fiyatlar pr
  join public.poz_surumleri pv
    on pv.sahip_id = pr.sahip_id
   and pv.id = pr.poz_surumu_id
  where pr.sahip_id = v_owner
    and pv.yayin_id = v_run.yayin_id
    and pr.aktarim_id = p_aktarim_id;

  select count(*)
  into v_coverage_errors
  from private.ham_satirlar rr
  where rr.sahip_id = v_owner
    and rr.aktarim_id = p_aktarim_id
    and (
      rr.ayristirma_durumu <> 'accepted'
      or (
        select count(*)
        from public.poz_surumleri pv
        where pv.sahip_id = rr.sahip_id
          and pv.yayin_id = rr.yayin_id
          and pv.aktarim_id = rr.aktarim_id
          and pv.ham_satir_id = rr.id
          and pv.kaynak_belge_id = rr.belge_id
      ) <> 1
      or (
        select count(*)
        from public.fiyatlar pr
        where pr.sahip_id = rr.sahip_id
          and pr.aktarim_id = rr.aktarim_id
          and pr.ham_satir_id = rr.id
          and pr.kaynak_belge_id = rr.belge_id
          and pr.fiyat_turu = 'unit_price'
          and pr.para_birimi_kodu = 'TRY'
      ) <> 1
    );

  if v_raw_rows = 0
     or v_accepted_rows <> v_raw_rows
     or v_unresolved_rows <> 0
     or v_errors <> 0
     or v_versions <> v_raw_rows
     or v_prices <> v_raw_rows
     or v_positions = 0
     or v_coverage_errors <> 0
     or v_run.gorulen_belge_sayisi <> v_documents
     or v_run.gorulen_ham_satir_sayisi <> v_raw_rows
     or v_run.islenen_poz_sayisi <> v_positions
     or v_run.islenen_surum_sayisi <> v_versions
     or v_run.islenen_fiyat_sayisi <> v_prices
     or v_run.uyari_sayisi <> 0
     or v_run.hata_sayisi <> 0 then
    raise exception using
      errcode = '23514',
      message = 'Ingestion run failed final counter, error, or one-to-one coverage checks';
  end if;

  update public.aktarim_calismalari
  set durum = 'complete',
      parametreler = parametreler || jsonb_build_object(
        'qa_confirmation', p_qa_onayi,
        'qa_profile', 'position_import_v1',
        'manual_qa_query_count', 15,
        'qa_finalized_at', clock_timestamp()
      )
  where sahip_id = v_owner
    and id = p_aktarim_id;

  return jsonb_build_object(
    'run_id', p_aktarim_id,
    'durum', 'complete',
    'ham_satirlar', v_raw_rows,
    'pozlar', v_positions,
    'versions', v_versions,
    'fiyatlar', v_prices
  );
end;
$$;
revoke all on function public.poz_aktarimini_tamamla(uuid, text) from public, anon;
grant execute on function public.poz_aktarimini_tamamla(uuid, text) to authenticated;
create or replace function public.poz_aktarimini_durdur(
  p_aktarim_id uuid,
  p_gerekce text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_owner uuid := auth.uid();
  v_run public.aktarim_calismalari%rowtype;
begin
  if v_owner is null then
    raise exception 'Authenticated user required';
  end if;

  if btrim(coalesce(p_gerekce, '')) = '' or char_length(btrim(p_gerekce)) > 1000 then
    raise exception using
      errcode = '22023',
      message = 'Abandon reason must contain between 1 and 1000 characters';
  end if;

  select ir.*
  into v_run
  from public.aktarim_calismalari ir
  where ir.sahip_id = v_owner
    and ir.id = p_aktarim_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Ingestion run not found';
  end if;

  if v_run.aktarim_turu <> 'position_import' or v_run.durum <> 'needs_review' then
    raise exception using
      errcode = '23514',
      message = 'Only a needs_review position_import run can be abandoned';
  end if;

  update public.aktarim_calismalari
  set durum = 'stopped',
      parametreler = parametreler || jsonb_build_object(
        'abandoned_at', clock_timestamp(),
        'abandon_reason', btrim(p_gerekce)
      )
  where sahip_id = v_owner
    and id = p_aktarim_id;

  return jsonb_build_object('run_id', p_aktarim_id, 'durum', 'stopped');
end;
$$;
revoke all on function public.poz_aktarimini_durdur(uuid, text) from public, anon;
grant execute on function public.poz_aktarimini_durdur(uuid, text) to authenticated;
create view public.v_guncel_fiyatlar
with (security_invoker = true)
as
select *
from (
  select
    p.sahip_id,
    p.id as poz_id,
    p.kod_ham,
    pv.tanim_ham,
    pv.birim_ham,
    pub.donem_etiketi_ham,
    pub.donem_sirasi,
    pr.fiyat_turu,
    pr.tutar,
    pr.para_birimi_kodu,
    row_number() over (
      partition by p.sahip_id, p.id, pr.fiyat_turu, pr.para_birimi_kodu
      order by pub.donem_sirasi desc, pub.gecerlilik_baslangici desc nulls last,
               pub.yayim_tarihi desc nulls last, pub.id desc
    ) as guncellik_sirasi
  from public.pozlar p
  join public.poz_surumleri pv
    on pv.sahip_id = p.sahip_id and pv.poz_id = p.id
  join public.yayinlar pub
    on pub.sahip_id = pv.sahip_id and pub.id = pv.yayin_id
  join public.aktarim_calismalari version_run
    on version_run.sahip_id = pv.sahip_id
   and version_run.id = pv.aktarim_id
   and version_run.durum = 'complete'
  join public.fiyatlar pr
    on pr.sahip_id = pv.sahip_id and pr.poz_surumu_id = pv.id
  join public.aktarim_calismalari price_run
    on price_run.sahip_id = pr.sahip_id
   and price_run.id = pr.aktarim_id
   and price_run.durum = 'complete'
) ranked
where guncellik_sirasi = 1;
create view public.v_fiyat_degisimleri
with (security_invoker = true)
as
select
  series.sahip_id,
  series.poz_id,
  series.kod_ham,
  series.tanim_ham,
  series.donem_etiketi_ham,
  series.donem_sirasi,
  series.fiyat_turu,
  series.tutar,
  series.onceki_tutar,
  series.tutar - series.onceki_tutar as mutlak_degisim,
  case
    when series.onceki_tutar is null or series.onceki_tutar = 0 then null
    else (series.tutar / series.onceki_tutar) - 1
  end as yuzde_degisim,
  series.para_birimi_kodu
from (
  select
    p.sahip_id,
    p.id as poz_id,
    p.kod_ham,
    pv.tanim_ham,
    pub.donem_etiketi_ham,
    pub.donem_sirasi,
    pr.fiyat_turu,
    pr.tutar,
    lag(pr.tutar) over (
      partition by p.sahip_id, p.id, pr.fiyat_turu, pr.para_birimi_kodu
      order by pub.donem_sirasi, pub.gecerlilik_baslangici nulls first,
               pub.yayim_tarihi nulls first, pub.id
    ) as onceki_tutar,
    pr.para_birimi_kodu
  from public.pozlar p
  join public.poz_surumleri pv
    on pv.sahip_id = p.sahip_id and pv.poz_id = p.id
  join public.yayinlar pub
    on pub.sahip_id = pv.sahip_id and pub.id = pv.yayin_id
  join public.aktarim_calismalari version_run
    on version_run.sahip_id = pv.sahip_id
   and version_run.id = pv.aktarim_id
   and version_run.durum = 'complete'
  join public.fiyatlar pr
    on pr.sahip_id = pv.sahip_id and pr.poz_surumu_id = pv.id
  join public.aktarim_calismalari price_run
    on price_run.sahip_id = pr.sahip_id
   and price_run.id = pr.aktarim_id
   and price_run.durum = 'complete'
) series;
create view public.v_poz_yasam_dongusu
with (security_invoker = true)
as
select
  p.sahip_id,
  p.id as poz_id,
  p.kod_ham,
  (array_agg(pub.id order by pub.donem_sirasi, pub.gecerlilik_baslangici nulls first, pub.id))[1]
    as ilk_yayin_id,
  (array_agg(pub.donem_etiketi_ham order by pub.donem_sirasi, pub.gecerlilik_baslangici nulls first, pub.id))[1]
    as ilk_donem_etiketi,
  (array_agg(pub.id order by pub.donem_sirasi desc, pub.gecerlilik_baslangici desc nulls last, pub.id desc))[1]
    as son_yayin_id,
  (array_agg(pub.donem_etiketi_ham order by pub.donem_sirasi desc, pub.gecerlilik_baslangici desc nulls last, pub.id desc))[1]
    as son_donem_etiketi,
  count(*) as surum_sayisi
from public.pozlar p
join public.poz_surumleri pv
  on pv.sahip_id = p.sahip_id and pv.poz_id = p.id
join public.yayinlar pub
  on pub.sahip_id = pv.sahip_id and pub.id = pv.yayin_id
join public.aktarim_calismalari version_run
  on version_run.sahip_id = pv.sahip_id
 and version_run.id = pv.aktarim_id
 and version_run.durum = 'complete'
group by p.sahip_id, p.id, p.kod_ham;
create view public.v_poz_disa_aktarim
with (security_invoker = true)
as
select
  pv.sahip_id,
  i.kod as kurum_kodu,
  i.ad as kurum_adi,
  bf.aile_anahtari as kitap_ailesi_anahtari,
  bf.ad as kitap_ailesi_adi,
  f.ad_ham as fasikul_adi,
  p.id as poz_id,
  p.kod_ham,
  p.kod_normalize,
  pv.id as poz_surumu_id,
  pv.kayit_turu,
  pv.tanim_ham,
  pv.tanim_normalize,
  pv.birim_ham,
  pv.birim_kodu,
  pub.id as yayin_id,
  pub.baslik as yayin_basligi,
  pub.donem_etiketi_ham,
  pub.donem_yili,
  pub.donem_ayi,
  pub.donem_revizyonu,
  pub.yayim_tarihi,
  pv.gecerlilik_baslangici,
  pv.gecerlilik_sonu,
  pr.fiyat_turu,
  pr.tutar_ham,
  pr.tutar,
  pr.para_birimi_kodu,
  d.kaynak_url,
  d.sha256 as kaynak_sha256,
  pv.kaynak_sayfa
from public.poz_surumleri pv
join public.pozlar p
  on p.sahip_id = pv.sahip_id and p.id = pv.poz_id
join public.kurumlar i
  on i.sahip_id = pv.sahip_id and i.id = pv.kurum_id
join public.kitap_aileleri bf
  on bf.sahip_id = pv.sahip_id and bf.id = pv.kitap_ailesi_id
join public.yayinlar pub
  on pub.sahip_id = pv.sahip_id and pub.id = pv.yayin_id
join public.belgeler d
  on d.sahip_id = pv.sahip_id and d.id = pv.kaynak_belge_id
join public.aktarim_calismalari version_run
  on version_run.sahip_id = pv.sahip_id
 and version_run.id = pv.aktarim_id
 and version_run.durum = 'complete'
left join public.fasikuller f
  on f.sahip_id = pv.sahip_id and f.id = pv.fasikul_id
left join public.fiyatlar pr
  on pr.sahip_id = pv.sahip_id
 and pr.poz_surumu_id = pv.id
 and exists (
   select 1
   from public.aktarim_calismalari price_run
   where price_run.sahip_id = pr.sahip_id
     and price_run.id = pr.aktarim_id
     and price_run.durum = 'complete'
 );
revoke all on public.v_guncel_fiyatlar, public.v_fiyat_degisimleri,
  public.v_poz_yasam_dongusu, public.v_poz_disa_aktarim
  from public, anon;
grant select on public.v_guncel_fiyatlar, public.v_fiyat_degisimleri,
  public.v_poz_yasam_dongusu, public.v_poz_disa_aktarim
  to authenticated, service_role;
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'kurumlar', 'kaynak_kataloglari', 'kitap_aileleri', 'fasikuller',
    'yayinlar', 'belgeler', 'yayin_belgeleri', 'pozlar',
    'poz_surumleri', 'fiyatlar', 'tarifler', 'gider_notlari',
    'analiz_satirlari', 'poz_iliskileri', 'guncelleme_endeksleri', 'revizyonlar',
    'birim_sozlugu', 'aktarim_calismalari'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;
commit;
