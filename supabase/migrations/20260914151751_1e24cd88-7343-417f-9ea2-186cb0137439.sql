CREATE OR REPLACE FUNCTION public.is_startup_member(_user_id uuid, _startup_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.startup_members sm WHERE sm.startup_id = _startup_id AND sm.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_startup_founder(_user_id uuid, _startup_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.startups s WHERE s.id = _startup_id AND s.founder_id = _user_id);
$$;

REVOKE EXECUTE ON FUNCTION public.is_startup_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_startup_founder(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_startup_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_startup_founder(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Startups viewable by related users" ON public.startups;
CREATE POLICY "Startups viewable by related users" ON public.startups FOR SELECT TO authenticated
USING (
  is_admin_or_coordinator(auth.uid())
  OR has_role(auth.uid(), 'project_manager'::app_role)
  OR has_role(auth.uid(), 'investor'::app_role)
  OR founder_id = auth.uid()
  OR public.is_startup_member(auth.uid(), id)
  OR EXISTS (
    SELECT 1 FROM public.mentor_matches mm
    WHERE mm.startup_id = startups.id
      AND (mm.mentor_id = auth.uid()
           OR mm.mentor_id IN (SELECT mp.id FROM public.mentor_profiles mp WHERE mp.user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Members viewable by involved" ON public.startup_members;
CREATE POLICY "Members viewable by involved" ON public.startup_members FOR SELECT TO authenticated
USING (
  is_admin_or_coordinator(auth.uid())
  OR user_id = auth.uid()
  OR public.is_startup_founder(auth.uid(), startup_id)
  OR EXISTS (
    SELECT 1 FROM public.mentor_matches mm
    WHERE mm.startup_id = startup_members.startup_id AND mm.mentor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Founders manage own KPIs" ON public.startup_kpis;
CREATE POLICY "Founders manage own KPIs" ON public.startup_kpis FOR ALL TO authenticated
USING (public.is_startup_founder(auth.uid(), startup_id))
WITH CHECK (public.is_startup_founder(auth.uid(), startup_id));

DROP POLICY IF EXISTS "KPIs viewable by members" ON public.startup_kpis;
CREATE POLICY "KPIs viewable by members" ON public.startup_kpis FOR SELECT TO authenticated
USING (is_admin_or_coordinator(auth.uid()) OR public.is_startup_member(auth.uid(), startup_id));