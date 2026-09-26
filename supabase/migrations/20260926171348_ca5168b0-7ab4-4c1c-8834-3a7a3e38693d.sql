GRANT INSERT, UPDATE ON public.accounting_account_guides TO authenticated;
CREATE POLICY "Admins gèrent les guides" ON public.accounting_account_guides FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
INSERT INTO public.accounting_journals(code,label,journal_type) VALUES ('AN','À-nouveaux','od') ON CONFLICT DO NOTHING;
UPDATE public.accounting_journals SET allowed_prefixes = ARRAY['40','44','60','61','62','63','2','47'] WHERE code='AC';
UPDATE public.accounting_journals SET allowed_prefixes = ARRAY['41','44','70','71','72','73','75','47'] WHERE code='VE';
UPDATE public.accounting_journals SET allowed_prefixes = ARRAY['42','43','44','66','47'] WHERE code='PA';