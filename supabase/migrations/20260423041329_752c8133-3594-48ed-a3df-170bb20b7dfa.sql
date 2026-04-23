-- 1) Sécuriser le search_path des 4 fonctions de queue email
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2) Restreindre le SELECT (listing) public sur les buckets sensibles
-- On garde avatars et logos publics. Les autres deviennent authentifiés uniquement.

DROP POLICY IF EXISTS "Anyone can view resources files" ON storage.objects;
DROP POLICY IF EXISTS "Public read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Grant docs public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view entity docs" ON storage.objects;
DROP POLICY IF EXISTS "Public read attachments" ON storage.objects;

CREATE POLICY "Authenticated read resources files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resources');

CREATE POLICY "Authenticated read receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated read grant docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'grant-documents');

CREATE POLICY "Authenticated read entity docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'entity-documents');

CREATE POLICY "Authenticated read message attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'message-attachments');

-- 3) Marquer ces buckets comme privés (ne plus servir d'URLs publiques anonymes)
UPDATE storage.buckets SET public = false
  WHERE id IN ('resources', 'receipts', 'grant-documents', 'entity-documents', 'message-attachments');