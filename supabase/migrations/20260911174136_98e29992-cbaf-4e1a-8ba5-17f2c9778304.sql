-- 1) Restreindre les policies "public" aux utilisateurs connectés
DROP POLICY IF EXISTS crm_contreparties_admin_all ON public.crm_contreparties;
CREATE POLICY crm_contreparties_admin_all ON public.crm_contreparties FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'));

DROP POLICY IF EXISTS crm_invoices_admin_all ON public.crm_invoices;
CREATE POLICY crm_invoices_admin_all ON public.crm_invoices FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'));

DROP POLICY IF EXISTS crm_invoice_lines_admin_all ON public.crm_invoice_lines;
CREATE POLICY crm_invoice_lines_admin_all ON public.crm_invoice_lines FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'));

DROP POLICY IF EXISTS crm_payments_admin_all ON public.crm_payments;
CREATE POLICY crm_payments_admin_all ON public.crm_payments FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'));

DROP POLICY IF EXISTS crm_subscriptions_admin_all ON public.crm_subscriptions;
CREATE POLICY crm_subscriptions_admin_all ON public.crm_subscriptions FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'));

DROP POLICY IF EXISTS crm_sub_occurrences_admin_all ON public.crm_subscription_occurrences;
CREATE POLICY crm_sub_occurrences_admin_all ON public.crm_subscription_occurrences FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'project_manager'));

DROP POLICY IF EXISTS "Users can view their own digest log" ON public.digest_email_log;
CREATE POLICY "Users can view their own digest log" ON public.digest_email_log FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "HR read agreements" ON public.hr_collective_agreements;
CREATE POLICY "HR read agreements" ON public.hr_collective_agreements FOR SELECT TO authenticated
USING (is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "HR write agreements" ON public.hr_collective_agreements;
CREATE POLICY "HR write agreements" ON public.hr_collective_agreements FOR ALL TO authenticated
USING (is_admin_or_coordinator(auth.uid())) WITH CHECK (is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "RH admins gèrent les contrats" ON public.hr_contracts;
CREATE POLICY "RH admins gèrent les contrats" ON public.hr_contracts FOR ALL TO authenticated
USING (is_admin_or_coordinator(auth.uid())) WITH CHECK (is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "RH admins gèrent les soldes" ON public.hr_leave_balances;
CREATE POLICY "RH admins gèrent les soldes" ON public.hr_leave_balances FOR ALL TO authenticated
USING (is_admin_or_coordinator(auth.uid())) WITH CHECK (is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "RH admins gèrent tous les congés" ON public.hr_leave_requests;
CREATE POLICY "RH admins gèrent tous les congés" ON public.hr_leave_requests FOR ALL TO authenticated
USING (is_admin_or_coordinator(auth.uid())) WITH CHECK (is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "HR read categories" ON public.hr_salary_categories;
CREATE POLICY "HR read categories" ON public.hr_salary_categories FOR SELECT TO authenticated
USING (is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "HR write categories" ON public.hr_salary_categories;
CREATE POLICY "HR write categories" ON public.hr_salary_categories FOR ALL TO authenticated
USING (is_admin_or_coordinator(auth.uid())) WITH CHECK (is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Admins delete receipts" ON storage.objects;
CREATE POLICY "Admins delete receipts" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Admins delete resources files" ON storage.objects;
CREATE POLICY "Admins delete resources files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resources' AND is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Admins manage logos" ON storage.objects;
CREATE POLICY "Admins manage logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND is_admin_or_coordinator(auth.uid()));

-- 2) Retirer l'exécution anonyme des fonctions de contrôle d'accès
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_scoped_role(uuid, app_role, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_coordinator(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_demo_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_accessible_portfolios(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_accessible_programs(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_accessible_projects(uuid) FROM anon;