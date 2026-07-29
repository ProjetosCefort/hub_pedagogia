-- =====================================================
-- Notifications table aligned with proposal requirements
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.notificacoes_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  related_entity_type TEXT NULL,
  related_entity_id UUID NULL,
  mensagem TEXT NOT NULL,
  destinatario_role public.app_role NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES auth.users(id)
);

ALTER TABLE public.notificacoes_internas
  ADD COLUMN IF NOT EXISTS created_by UUID NULL;

ALTER TABLE public.notificacoes_internas
  ALTER COLUMN related_entity_type DROP NOT NULL;

ALTER TABLE public.notificacoes_internas
  ALTER COLUMN jovem_id DROP NOT NULL;

ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_related_entity_type_check;

ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_jovem_id_fkey;

ALTER TABLE public.notificacoes_internas
  ADD CONSTRAINT notificacoes_internas_jovem_id_fkey
  FOREIGN KEY (jovem_id) REFERENCES public.jovens(id) ON DELETE CASCADE;

ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_created_by_fkey;

ALTER TABLE public.notificacoes_internas
  ADD CONSTRAINT notificacoes_internas_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

DROP INDEX IF EXISTS idx_notificacoes_destinatario;
DROP INDEX IF EXISTS idx_notificacoes_created_at;

CREATE INDEX IF NOT EXISTS idx_notificacoes_role_lida_created
  ON public.notificacoes_internas(destinatario_role, lida, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_jovem_created
  ON public.notificacoes_internas(jovem_id, created_at DESC);

ALTER TABLE public.notificacoes_internas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "UsuÃƒÆ’Ã‚Â¡rio pode ler notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do prÃƒÆ’Ã‚Â³prio papel" ON public.notificacoes_internas;
DROP POLICY IF EXISTS "UsuÃƒÆ’Ã‚Â¡rio pode atualizar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do prÃƒÆ’Ã‚Â³prio papel" ON public.notificacoes_internas;

CREATE POLICY "Staff enxergam notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes por papel"
  ON public.notificacoes_internas
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid())
    AND (
      public.has_role(auth.uid(), destinatario_role)
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Staff inserem notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON public.notificacoes_internas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Staff atualizam notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do prÃƒÆ’Ã‚Â³prio papel"
  ON public.notificacoes_internas
  FOR UPDATE
  TO authenticated
  USING (
    public.has_any_role(auth.uid())
    AND (
      public.has_role(auth.uid(), destinatario_role)
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    public.has_any_role(auth.uid())
    AND (
      public.has_role(auth.uid(), destinatario_role)
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.create_internal_notification(
  p_jovem_id UUID,
  p_related_type TEXT,
  p_related_id UUID,
  p_mensagem TEXT,
  p_role public.app_role,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_author UUID;
BEGIN
  IF p_mensagem IS NULL OR p_role IS NULL THEN
    RETURN NULL;
  END IF;

  v_author := COALESCE(p_created_by, auth.uid());

  INSERT INTO public.notificacoes_internas (
    jovem_id,
    related_entity_type,
    related_entity_id,
    mensagem,
    destinatario_role,
    created_by
  )
  VALUES (
    p_jovem_id,
    p_related_type,
    p_related_id,
    p_mensagem,
    p_role,
    v_author
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_internal_notification(UUID, TEXT, UUID, TEXT, public.app_role, UUID) TO authenticated;
