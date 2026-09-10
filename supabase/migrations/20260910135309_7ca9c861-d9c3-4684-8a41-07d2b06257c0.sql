DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS f
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.f);
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