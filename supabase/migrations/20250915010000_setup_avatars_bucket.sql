-- Create a public 'avatars' storage bucket (id must be unique)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS policies for storage.objects specific to the 'avatars' bucket
-- Allow public read access for all files inside 'avatars'
create policy if not exists "Public read access for avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to upload files under a folder named after their user id
create policy if not exists "Users can upload to their own avatars folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update files inside their own folder
create policy if not exists "Users can update avatars in their folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete files inside their own folder
create policy if not exists "Users can delete avatars in their folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Optional: constrain MIME types or size limits for the bucket (uncomment and adjust if needed)
-- update storage.buckets set
--   allowed_mime_types = array['image/png','image/jpeg','image/webp']::text[],
--   file_size_limit = 5242880 -- 5MB
-- where id = 'avatars';
