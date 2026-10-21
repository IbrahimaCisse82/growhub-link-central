-- Semaine 2 — sécurité : fermer l'accès anonyme aux pièces jointes de messagerie et aux ressources.
--
-- Avant : politiques « Public read … » sans clause TO, donc ouvertes au rôle anon.
-- Avec la clé publique présente dans le navigateur, n'importe qui pouvait lister et
-- télécharger ces fichiers. Un nom de fichier UUID n'est pas un secret.
--
-- Après : espaces privés ; un fichier n'est lisible que par un utilisateur connecté
-- qui a le droit de voir la ligne qui le référence (RLS de message_attachments et
-- de resources), par son déposant, ou par un administrateur/coordinateur.
-- Le frontend affiche ces fichiers par URL signée (src/lib/storageSignedUrl.ts).
--
-- Les lignes existantes stockent soit un chemin, soit l'ancienne URL publique
-- (…/object/public/<espace>/<chemin>) : les deux formes sont reconnues ci-dessous.

UPDATE storage.buckets SET public = false WHERE id IN ('message-attachments', 'resources');

DROP POLICY IF EXISTS "Public read message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read resources files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view resources files" ON storage.objects;

CREATE POLICY "Members read message attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (
      owner = auth.uid()
      OR public.is_admin_or_coordinator(auth.uid())
      -- La sous-requête s'exécute avec les droits de l'appelant : la RLS de
      -- message_attachments limite déjà aux membres du canal.
      OR EXISTS (
        SELECT 1 FROM public.message_attachments ma
        WHERE ma.file_url = storage.objects.name
           OR ma.file_url LIKE '%/message-attachments/' || storage.objects.name
      )
    )
  );

CREATE POLICY "Allowed users read resource files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resources'
    AND (
      owner = auth.uid()
      OR public.is_admin_or_coordinator(auth.uid())
      -- La RLS de resources limite aux ressources publiques, à celles du déposant
      -- et aux administrateurs.
      OR EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.file_url = storage.objects.name
           OR r.file_url LIKE '%/resources/' || storage.objects.name
      )
    )
  );
