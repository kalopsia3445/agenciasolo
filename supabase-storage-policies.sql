-- Storage policies for brand-assets bucket
-- Cole no SQL Editor do Supabase

create policy "Users can upload own assets"
  on storage.objects for insert
  with check (bucket_id = 'brand-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view brand assets"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

create policy "Users can delete own assets"
  on storage.objects for delete
  using (bucket_id = 'brand-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own assets"
  on storage.objects for update
  using (bucket_id = 'brand-assets' and auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for generated_images bucket
create policy "Anyone can view generated images"
  on storage.objects for select
  using (bucket_id = 'generated_images');

create policy "Users can upload own generated images"
  on storage.objects for insert
  with check (bucket_id = 'generated_images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own generated images"
  on storage.objects for delete
  using (bucket_id = 'generated_images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own generated images"
  on storage.objects for update
  using (bucket_id = 'generated_images' and auth.uid()::text = (storage.foldername(name))[1]);
