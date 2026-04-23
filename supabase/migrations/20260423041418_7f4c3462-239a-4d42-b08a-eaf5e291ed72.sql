-- Restaurer les buckets publics
UPDATE storage.buckets SET public = true
  WHERE id IN ('avatars', 'logos', 'resources', 'receipts', 'grant-documents', 'entity-documents', 'message-attachments');

-- Restaurer les policies de lecture publique (les noms de fichiers sont des UUID)
DROP POLICY IF EXISTS "Authenticated read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read resources files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read grant docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read entity docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read message attachments" ON storage.objects;

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Public read resources" ON storage.objects FOR SELECT USING (bucket_id = 'resources');
CREATE POLICY "Public read receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Public read grant docs" ON storage.objects FOR SELECT USING (bucket_id = 'grant-documents');
CREATE POLICY "Public read entity docs" ON storage.objects FOR SELECT USING (bucket_id = 'entity-documents');
CREATE POLICY "Public read message attachments" ON storage.objects FOR SELECT USING (bucket_id = 'message-attachments');