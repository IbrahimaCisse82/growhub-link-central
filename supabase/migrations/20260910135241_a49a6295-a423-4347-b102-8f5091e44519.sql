-- 1. PROFILES
DROP POLICY IF EXISTS "Approved profiles viewable by authenticated" ON public.profiles;

DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_invoker = off) AS
SELECT id, user_id, full_name, avatar_url, bio, organization, "position", linkedin_url,
       is_approved, created_at, updated_at,
       CASE WHEN user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid()) THEN email ELSE NULL::text END AS email,
       CASE WHEN user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid()) THEN phone ELSE NULL::text END AS phone
FROM public.profiles
WHERE is_approved = true;
GRANT SELECT ON public.profiles_safe TO authenticated;

-- 2. HR EMPLOYEES
DROP POLICY IF EXISTS "HR employees viewable by authenticated" ON public.hr_employees;

-- 3. STARTUPS
DROP POLICY IF EXISTS "Startups viewable by authenticated" ON public.startups;
CREATE POLICY "Startups viewable by related users" ON public.startups
FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR public.has_role(auth.uid(), 'project_manager')
  OR public.has_role(auth.uid(), 'investor')
  OR founder_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.startup_members m WHERE m.startup_id = startups.id AND m.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.mentor_matches mm
    WHERE mm.startup_id = startups.id
      AND (mm.mentor_id = auth.uid()
           OR mm.mentor_id IN (SELECT mp.id FROM public.mentor_profiles mp WHERE mp.user_id = auth.uid()))
  )
);

-- 4. GRANTS
DROP POLICY IF EXISTS "Grants viewable by authenticated" ON public.grants;
CREATE POLICY "Grants viewable by scoped users" ON public.grants
FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR public.has_role(auth.uid(), 'project_manager')
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
  OR (program_id IS NOT NULL AND program_id IN (SELECT public.user_accessible_programs(auth.uid())))
  OR public.has_scoped_role(auth.uid(), 'funder', 'grant', id)
);

-- 5. PARTNERS
DROP POLICY IF EXISTS "Partners viewable by authenticated" ON public.partners;
CREATE POLICY "Partners viewable by scoped users" ON public.partners
FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR public.has_role(auth.uid(), 'project_manager')
  OR (program_id IS NOT NULL AND program_id IN (SELECT public.user_accessible_programs(auth.uid())))
);

-- 6. CRM QUOTES
DROP POLICY IF EXISTS "quotes_user_read" ON public.crm_quotes;
CREATE POLICY "quotes_scoped_read" ON public.crm_quotes
FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR public.has_role(auth.uid(), 'project_manager')
  OR created_by = auth.uid()
);

-- 7. STORAGE
DROP POLICY IF EXISTS "Authenticated upload attachments" ON storage.objects;
CREATE POLICY "Users upload own attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users delete own attachments" ON storage.objects;
CREATE POLICY "Users delete own attachments" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND (owner = auth.uid() OR public.is_admin_or_coordinator(auth.uid())));

DROP POLICY IF EXISTS "Auth users upload grant docs" ON storage.objects;
CREATE POLICY "Staff upload grant docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'grant-documents' AND (public.is_admin_or_coordinator(auth.uid()) OR public.has_role(auth.uid(), 'project_manager')));

DROP POLICY IF EXISTS "Auth users delete grant docs" ON storage.objects;
CREATE POLICY "Staff delete grant docs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'grant-documents' AND (owner = auth.uid() OR public.is_admin_or_coordinator(auth.uid())));

DROP POLICY IF EXISTS "Authenticated users upload entity docs" ON storage.objects;
CREATE POLICY "Staff upload entity docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'entity-documents' AND (public.is_admin_or_coordinator(auth.uid()) OR public.has_role(auth.uid(), 'project_manager')));

DROP POLICY IF EXISTS "Users delete own entity docs" ON storage.objects;
CREATE POLICY "Users delete own entity docs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'entity-documents' AND (owner = auth.uid() OR public.is_admin_or_coordinator(auth.uid())));

-- 8. SECURITY DEFINER FUNCTION EXECUTE PRIVILEGES
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS f
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.f);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_scoped_role(uuid, app_role, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_coordinator(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_accessible_projects(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_accessible_programs(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_accessible_portfolios(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_invitation_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.should_notify(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_startup_health_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_messages(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_cost_breakdown(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cashflow_summary(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid, text) TO authenticated;