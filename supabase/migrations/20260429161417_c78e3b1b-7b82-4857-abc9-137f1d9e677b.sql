-- 1. Enrichir l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consultant_expert';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consultant_coach';

-- 2. Enrichir profiles avec hiérarchie & contexte
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reports_to_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Dakar',
  ADD COLUMN IF NOT EXISTS language_pref text DEFAULT 'fr';

CREATE INDEX IF NOT EXISTS idx_profiles_reports_to ON public.profiles(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

-- 3. Table role_assignments (scope fin)
CREATE TABLE IF NOT EXISTS public.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('global','portfolio','program','project','cohort')),
  scope_id uuid,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON public.role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_scope ON public.role_assignments(scope_type, scope_id);

ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage role assignments"
  ON public.role_assignments
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Users view own role assignments"
  ON public.role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Fonctions SECURITY DEFINER pour scoping

-- has_scoped_role : vérifie si l'utilisateur a un rôle sur un périmètre donné (ou global)
CREATE OR REPLACE FUNCTION public.has_scoped_role(
  _user_id uuid,
  _role public.app_role,
  _scope_type text DEFAULT NULL,
  _scope_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_assignments
    WHERE user_id = _user_id
      AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        scope_type = 'global'
        OR (_scope_type IS NOT NULL AND scope_type = _scope_type AND (scope_id = _scope_id OR scope_id IS NULL))
      )
  ) OR EXISTS (
    -- Compatibilité descendante avec user_roles
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- user_accessible_portfolios : liste des portfolios accessibles à un user
CREATE OR REPLACE FUNCTION public.user_accessible_portfolios(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins/coordinateurs globaux : tout
  SELECT id FROM public.portfolios
  WHERE public.is_admin_or_coordinator(_user_id)
  UNION
  -- Assignations directes sur portfolio
  SELECT scope_id FROM public.role_assignments
  WHERE user_id = _user_id
    AND scope_type = 'portfolio'
    AND scope_id IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- user_accessible_programs : programmes accessibles
CREATE OR REPLACE FUNCTION public.user_accessible_programs(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.programs
  WHERE public.is_admin_or_coordinator(_user_id)
  UNION
  SELECT scope_id FROM public.role_assignments
  WHERE user_id = _user_id
    AND scope_type = 'program'
    AND scope_id IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  UNION
  -- Programmes des portfolios accessibles
  SELECT p.id FROM public.programs p
  WHERE p.portfolio_id IN (
    SELECT scope_id FROM public.role_assignments
    WHERE user_id = _user_id
      AND scope_type = 'portfolio'
      AND scope_id IS NOT NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- user_accessible_projects : projets accessibles
CREATE OR REPLACE FUNCTION public.user_accessible_projects(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.projects
  WHERE public.is_admin_or_coordinator(_user_id)
  UNION
  -- Assignations directes
  SELECT scope_id FROM public.role_assignments
  WHERE user_id = _user_id
    AND scope_type = 'project'
    AND scope_id IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  UNION
  -- Owner direct
  SELECT id FROM public.projects WHERE owner_id = _user_id
  UNION
  -- Projets des programmes accessibles
  SELECT pr.id FROM public.projects pr
  WHERE pr.program_id IN (SELECT public.user_accessible_programs(_user_id));
$$;

-- 5. Trigger: auto-archiver assignations sur suppression user
CREATE OR REPLACE FUNCTION public.cleanup_role_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.role_assignments WHERE user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_role_assignments ON public.profiles;
CREATE TRIGGER trg_cleanup_role_assignments
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_role_assignments();