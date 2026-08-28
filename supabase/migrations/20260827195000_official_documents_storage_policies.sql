-- The private `official-documents` bucket is created separately through the
-- Supabase Dashboard or Storage API. This migration only manages object RLS.
--
-- Expected object key:
--   owner_uuid/publication_uuid/document_uuid/sha256.ext
-- Authenticated clients may read and insert only. Update/delete is deliberately
-- withheld so a hash-named evidence object cannot be overwritten in place.

drop policy if exists "official_documents_select_own_prefix"
on storage.objects;
create policy "official_documents_select_own_prefix"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'official-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "official_documents_insert_own_prefix"
on storage.objects;
create policy "official_documents_insert_own_prefix"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'official-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "official_documents_update_own_prefix"
on storage.objects;
drop policy if exists "official_documents_delete_own_prefix"
on storage.objects;
