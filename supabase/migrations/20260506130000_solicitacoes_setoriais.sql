-- =============================================
-- Solicitacoes entre setores com devolutiva
-- =============================================

CREATE TABLE IF NOT EXISTS public.solicitacoes_setoriais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  setor_origem TEXT NOT NULL CHECK (
    setor_origem = ANY (ARRAY['pedagogico', 'psicossocial', 'servico_social'])
  ),
  setor_destino TEXT NOT NULL CHECK (
    setor_destino = ANY (ARRAY['pedagogico', 'psicossocial', 'servico_social'])
  ),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (
    prioridade = ANY (ARRAY['baixa', 'media', 'alta'])
  ),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (
    status = ANY (ARRAY['aberta', 'em_andamento', 'respondida', 'concluida', 'cancelada'])
  ),
  prazo_resposta DATE,
  devolutiva TEXT,
  solicitada_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  respondida_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_setoriais_jovem
  ON public.solicitacoes_setoriais(jovem_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_setoriais_destino_status
  ON public.solicitacoes_setoriais(setor_destino, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_setoriais_origem_status
  ON public.solicitacoes_setoriais(setor_origem, status, created_at DESC);

ALTER TABLE public.solicitacoes_setoriais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read solicitacoes_setoriais"
  ON public.solicitacoes_setoriais
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can insert solicitacoes_setoriais"
  ON public.solicitacoes_setoriais
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can update solicitacoes_setoriais"
  ON public.solicitacoes_setoriais
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Admin/Gestor can delete solicitacoes_setoriais"
  ON public.solicitacoes_setoriais
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE OR REPLACE FUNCTION public.set_updated_at_solicitacoes_setoriais()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_solicitacoes_setoriais ON public.solicitacoes_setoriais;
CREATE TRIGGER trg_set_updated_at_solicitacoes_setoriais
BEFORE UPDATE ON public.solicitacoes_setoriais
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_solicitacoes_setoriais();

ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_related_entity_type_check;

ALTER TABLE public.notificacoes_internas
  ADD CONSTRAINT notificacoes_internas_related_entity_type_check
  CHECK (
    related_entity_type IS NULL
    OR related_entity_type = ANY (
      ARRAY[
        'intervencao',
        'avaliacao',
        'documento',
        'status_change',
        'tarefa',
        'encaminhamento',
        'pendencia',
        'internal_note',
        'conselho_classe',
        'certificacoes',
        'solicitacao_setorial'
      ]
    )
  );

CREATE OR REPLACE FUNCTION public.map_setor_to_role(p_setor TEXT)
RETURNS public.app_role
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_setor
    WHEN 'pedagogico' THEN 'analista_pedagogico'::public.app_role
    WHEN 'psicossocial' THEN 'analista_psicossocial'::public.app_role
    WHEN 'servico_social' THEN 'analista_social'::public.app_role
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_solicitacao_setorial_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_role_destino public.app_role;
  v_role_origem public.app_role;
  v_msg TEXT;
BEGIN
  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  v_role_destino := public.map_setor_to_role(NEW.setor_destino);
  v_role_origem := public.map_setor_to_role(NEW.setor_origem);

  IF TG_OP = 'INSERT' THEN
    IF v_role_destino IS NOT NULL THEN
      v_msg := format(
        'Nova solicitação para %s: %s (%s)',
        coalesce(v_nome, 'jovem'),
        NEW.titulo,
        NEW.setor_origem
      );
      PERFORM public.create_internal_notification(
        v_role_destino,
        v_msg,
        NEW.jovem_id,
        'solicitacao_setorial',
        NEW.id
      );
    END IF;
    RETURN NEW;
  END IF;

  IF (
    NEW.status IS DISTINCT FROM OLD.status
    OR coalesce(NEW.devolutiva, '') IS DISTINCT FROM coalesce(OLD.devolutiva, '')
  ) THEN
    IF v_role_origem IS NOT NULL THEN
      v_msg := format(
        'Atualização da solicitação de %s: %s (%s)',
        coalesce(v_nome, 'jovem'),
        NEW.titulo,
        NEW.status
      );
      PERFORM public.create_internal_notification(
        v_role_origem,
        v_msg,
        NEW.jovem_id,
        'solicitacao_setorial',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_solicitacao_setorial_change ON public.solicitacoes_setoriais;
CREATE TRIGGER trg_notify_solicitacao_setorial_change
AFTER INSERT OR UPDATE ON public.solicitacoes_setoriais
FOR EACH ROW
EXECUTE FUNCTION public.notify_solicitacao_setorial_change();

COMMENT ON TABLE public.solicitacoes_setoriais IS
  'Solicitacoes entre setores com acompanhamento de status e devolutiva.';
