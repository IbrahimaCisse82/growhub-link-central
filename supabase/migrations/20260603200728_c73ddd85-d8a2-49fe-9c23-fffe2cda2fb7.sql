REVOKE EXECUTE ON FUNCTION public.anonymize_user_data(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.anonymize_user_data(uuid) TO authenticated, service_role;