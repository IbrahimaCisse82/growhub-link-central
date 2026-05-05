
-- 1. Passer les buckets en privé
UPDATE storage.buckets SET public = false WHERE id IN ('grant-documents','entity-documents','receipts');

-- 2. Supprimer les anciennes politiques publiques
DROP POLICY IF EXISTS "Public read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public read grant docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read grant docs" ON storage.objects;
DROP POLICY IF EXISTS "Grant docs public read" ON storage.objects;
DROP POLICY IF EXISTS "Public read entity docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read entity docs" ON storage.objects;
DROP POLICY IF EXISTS "Entity docs public read" ON storage.objects;

-- 3. Receipts : propriétaire (créateur de la transaction) ou admin/coordinateur
CREATE POLICY "Read receipts (owner or coord)" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'receipts' AND (
      public.is_admin_or_coordinator(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.grant_transactions gt
        WHERE gt.receipt_url LIKE '%' || name AND gt.created_by = auth.uid()
      )
    )
  );

-- 4. Grant documents : admin/coord ou rôle scopé sur le projet/programme de la subvention
CREATE POLICY "Read grant docs (scope based)" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'grant-documents' AND (
      public.is_admin_or_coordinator(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.grants g
        WHERE (split_part(name, '/', 1))::uuid = g.id
          AND (
            g.project_id IN (SELECT public.user_accessible_projects(auth.uid()))
            OR public.has_scoped_role(auth.uid(), 'funder', 'grant', g.id)
          )
      )
    )
  );

-- 5. Entity documents : admin/coord ou utilisateur du projet/programme lié
CREATE POLICY "Read entity docs (scope based)" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'entity-documents' AND (
      public.is_admin_or_coordinator(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.entity_documents ed
        WHERE ed.file_url LIKE '%' || name
          AND (
            (ed.entity_type = 'project' AND ed.entity_id IN (SELECT public.user_accessible_projects(auth.uid())))
            OR (ed.entity_type = 'program' AND ed.entity_id IN (SELECT public.user_accessible_programs(auth.uid())))
            OR ed.uploaded_by = auth.uid()
          )
      )
    )
  );
