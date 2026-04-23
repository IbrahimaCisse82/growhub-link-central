-- Restreindre listing avatars et logos
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;

CREATE POLICY "Authenticated read avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated read logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'logos');

UPDATE storage.buckets SET public = false WHERE id IN ('avatars', 'logos');