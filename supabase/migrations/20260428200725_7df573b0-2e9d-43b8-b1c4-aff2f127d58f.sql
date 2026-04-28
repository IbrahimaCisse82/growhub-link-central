-- Création d'un compte démo super_admin
DO $$
DECLARE
  _user_id uuid := gen_random_uuid();
  _email text := 'demo@growhub.app';
  _password text := 'Demo2026!';
  _encrypted_pw text;
BEGIN
  -- Si l'utilisateur existe déjà, ne rien faire
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
    RAISE NOTICE 'Compte démo déjà existant, aucune action.';
    RETURN;
  END IF;

  _encrypted_pw := crypt(_password, gen_salt('bf'));

  -- Insère dans auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    _user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    _email, _encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Démo Super Admin"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  -- Insère identité (nécessaire pour login email)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), _user_id,
    jsonb_build_object('sub', _user_id::text, 'email', _email, 'email_verified', true),
    'email', _user_id::text,
    now(), now(), now()
  );

  -- Le trigger handle_new_user crée déjà le profil et un rôle entrepreneur.
  -- On force le rôle super_admin et l'approbation.
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'super_admin');
  UPDATE public.profiles SET is_approved = true, full_name = 'Démo Super Admin' WHERE user_id = _user_id;

  RAISE NOTICE 'Compte démo créé : % / %', _email, _password;
END $$;