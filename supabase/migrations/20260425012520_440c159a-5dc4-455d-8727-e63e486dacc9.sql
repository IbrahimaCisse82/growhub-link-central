DROP VIEW IF EXISTS public.hr_contract_alerts;
CREATE VIEW public.hr_contract_alerts WITH (security_invoker = true) AS
SELECT 
  c.id AS contract_id,
  c.employee_id,
  e.matricule,
  e.prenom,
  e.nom,
  c.contract_type,
  c.end_date,
  c.trial_end_date,
  CASE 
    WHEN c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE THEN 'expired'
    WHEN c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'critical'
    WHEN c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'warning'
    WHEN c.trial_end_date IS NOT NULL AND c.trial_end_date <= CURRENT_DATE + INTERVAL '15 days' AND c.trial_end_date > CURRENT_DATE THEN 'trial_ending'
    ELSE 'ok'
  END AS alert_level,
  CASE 
    WHEN c.end_date IS NOT NULL THEN c.end_date - CURRENT_DATE
    ELSE NULL
  END AS days_remaining
FROM public.hr_contracts c
JOIN public.hr_employees e ON e.id = c.employee_id
WHERE c.is_active = true AND e.archived_at IS NULL;