-- Helper: should we notify a user for a given category?
CREATE OR REPLACE FUNCTION public.should_notify(_user_id uuid, _category text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE _category
      WHEN 'task'        THEN task_notifications
      WHEN 'application' THEN application_notifications
      WHEN 'coaching'    THEN coaching_notifications
      WHEN 'milestone'   THEN milestone_notifications
      WHEN 'risk'        THEN risk_notifications
      WHEN 'message'     THEN message_notifications
      ELSE true
    END
    FROM public.user_notification_prefs WHERE user_id = _user_id
  ), true);
$$;

-- Update notify_task_assigned to respect prefs
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE assigner_name text;
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id)
     AND public.should_notify(NEW.assignee_id, 'task') THEN
    SELECT full_name INTO assigner_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
    INSERT INTO public.notifications (user_id, title, content, type, link)
    VALUES (NEW.assignee_id, '📋 Tâche assignée',
      COALESCE(assigner_name, 'Un utilisateur') || ' vous a assigné : ' || NEW.title,
      'task', '/app/taches');
  END IF;
  RETURN NEW;
END;
$$;

-- Update notify_application_status
CREATE OR REPLACE FUNCTION public.notify_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE status_label text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND public.should_notify(NEW.applicant_id, 'application') THEN
    status_label := CASE NEW.status
      WHEN 'screening' THEN '🔍 En cours d''examen'
      WHEN 'interview' THEN '🎤 Entretien programmé'
      WHEN 'due_diligence' THEN '📊 Due Diligence'
      WHEN 'accepted' THEN '🎉 Acceptée'
      WHEN 'rejected' THEN '❌ Refusée'
      ELSE NEW.status::text
    END;
    INSERT INTO public.notifications (user_id, title, content, type, link)
    VALUES (NEW.applicant_id, 'Candidature : ' || status_label,
      'Votre candidature a été mise à jour.', 'application', '/app/candidatures');
  END IF;
  RETURN NEW;
END;
$$;

-- Update notify_milestone_completed
CREATE OR REPLACE FUNCTION public.notify_milestone_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE project_owner uuid;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT owner_id INTO project_owner FROM public.projects WHERE id = NEW.project_id;
    IF project_owner IS NOT NULL AND public.should_notify(project_owner, 'milestone') THEN
      INSERT INTO public.notifications (user_id, title, content, type, link)
      VALUES (project_owner, '🏁 Jalon atteint',
        'Le jalon "' || NEW.title || '" est terminé !', 'milestone', '/app/jalons');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Update notify_coaching_session
CREATE OR REPLACE FUNCTION public.notify_coaching_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE founder uuid; mentor_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF public.should_notify(NEW.mentor_id, 'coaching') THEN
      INSERT INTO public.notifications (user_id, title, content, type, link)
      VALUES (NEW.mentor_id, '📅 Nouvelle session', 'Session "' || NEW.title || '" programmée.', 'coaching', '/app/coaching');
    END IF;
    SELECT founder_id INTO founder FROM public.startups WHERE id = NEW.startup_id;
    IF founder IS NOT NULL AND founder != NEW.mentor_id AND public.should_notify(founder, 'coaching') THEN
      SELECT full_name INTO mentor_name FROM public.profiles WHERE user_id = NEW.mentor_id LIMIT 1;
      INSERT INTO public.notifications (user_id, title, content, type, link)
      VALUES (founder, '📅 Session avec ' || COALESCE(mentor_name, 'votre mentor'), NEW.title, 'coaching', '/app/coaching');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT founder_id INTO founder FROM public.startups WHERE id = NEW.startup_id;
    IF NEW.status = 'confirmed' THEN
      IF founder IS NOT NULL AND public.should_notify(founder, 'coaching') THEN
        INSERT INTO public.notifications (user_id, title, content, type, link)
        VALUES (founder, '✅ Session confirmée', 'La session "' || NEW.title || '" est confirmée.', 'coaching', '/app/coaching');
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF public.should_notify(NEW.mentor_id, 'coaching') THEN
        INSERT INTO public.notifications (user_id, title, content, type, link)
        VALUES (NEW.mentor_id, '❌ Session annulée', '"' || NEW.title || '" a été annulée.', 'coaching', '/app/coaching');
      END IF;
      IF founder IS NOT NULL AND public.should_notify(founder, 'coaching') THEN
        INSERT INTO public.notifications (user_id, title, content, type, link)
        VALUES (founder, '❌ Session annulée', '"' || NEW.title || '" a été annulée.', 'coaching', '/app/coaching');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Update notify_risk_escalation
CREATE OR REPLACE FUNCTION public.notify_risk_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE project_owner uuid;
BEGIN
  IF NEW.level = 'critical' AND (OLD.level IS DISTINCT FROM 'critical') THEN
    SELECT owner_id INTO project_owner FROM public.projects WHERE id = NEW.project_id;
    IF project_owner IS NOT NULL AND public.should_notify(project_owner, 'risk') THEN
      INSERT INTO public.notifications (user_id, title, content, type, link)
      VALUES (project_owner, '🚨 Risque critique', '"' || NEW.title || '" est passé en niveau critique.', 'risk', '/app/risques');
    END IF;
    -- Admins always notified (safety override) but still respect prefs
    INSERT INTO public.notifications (user_id, title, content, type, link)
    SELECT ur.user_id, '🚨 Risque critique', '"' || NEW.title || '" est passé en niveau critique.', 'risk', '/app/risques'
    FROM public.user_roles ur
    WHERE ur.role IN ('super_admin', 'coordinator')
      AND public.should_notify(ur.user_id, 'risk');
  END IF;
  RETURN NEW;
END;
$$;

-- Update notify_new_message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant record;
  conv_title text;
  sender_name text;
BEGIN
  SELECT title INTO conv_title FROM public.conversations WHERE id = NEW.conversation_id;
  SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;

  FOR participant IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    IF public.should_notify(participant.user_id, 'message') THEN
      INSERT INTO public.notifications (user_id, title, content, type, link)
      VALUES (participant.user_id, '💬 ' || COALESCE(sender_name, 'Utilisateur'),
        LEFT(NEW.content, 100), 'message', '/app/messagerie');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Digest log table (idempotency)
CREATE TABLE IF NOT EXISTS public.digest_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  notifications_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

ALTER TABLE public.digest_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own digest log"
ON public.digest_email_log FOR SELECT
USING (auth.uid() = user_id OR public.is_admin_or_coordinator(auth.uid()));