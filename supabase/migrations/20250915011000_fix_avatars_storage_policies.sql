-- Ensure 'avatars' bucket exists and is public
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

update storage.buckets set public = true where id = 'avatars';

-- Optionally set constraints for safety
update storage.buckets set
  allowed_mime_types = array['image/png','image/jpeg','image/webp']::text[],
  file_size_limit = 5242880
where id = 'avatars';

-- Drop known existing policies to avoid conflicts, then recreate a correct set
-- Note: You cannot drop by predicate; must drop by name.
-- This block safely drops if they exist, then recreates policies.

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and polname = 'Public read access for avatars') then
    drop policy "Public read access for avatars" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and polname = 'Users can upload to their own avatars folder') then
    drop policy "Users can upload to their own avatars folder" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and polname = 'Users can update avatars in their folder') then
    drop policy "Users can update avatars in their folder" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and polname = 'Users can delete avatars in their folder') then
    drop policy "Users can delete avatars in their folder" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and polname = 'Users manage own avatars (split_part)') then
    drop policy "Users manage own avatars (split_part)" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and polname = 'auth manage avatars simple') then
    drop policy "auth manage avatars simple" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and polname = 'TEMP auth can manage avatars') then
    drop policy "TEMP auth can manage avatars" on storage.objects;
  end if;
end $$;

-- Public read access so getPublicUrl works
drop policy if exists "Public read access for avatars" on storage.objects;
create policy "Public read access for avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Secure policy: Users can only manage files inside their own <auth.uid()>/ folder
create policy "Users manage own avatars (split_part)"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
