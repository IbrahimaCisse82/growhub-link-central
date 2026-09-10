DROP POLICY IF EXISTS "Authenticated users upload receipts" ON storage.objects;
CREATE POLICY "Scoped upload receipts" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    public.is_admin_or_coordinator(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      AND EXISTS (
        SELECT 1 FROM public.grants g
        WHERE g.id = ((storage.foldername(name))[1])::uuid
          AND (
            (g.project_id IS NOT NULL AND g.project_id IN (SELECT public.user_accessible_projects(auth.uid())))
            OR public.has_scoped_role(auth.uid(), 'funder', 'grant', g.id)
            OR public.has_role(auth.uid(), 'project_manager')
          )
      )
    )
  )
);

DROP POLICY IF EXISTS "Authenticated upload resources" ON storage.objects;
CREATE POLICY "Staff upload resources" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resources' AND public.is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users upload logos" ON storage.objects;
CREATE POLICY "Staff upload logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos' AND public.is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users upload avatars" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);