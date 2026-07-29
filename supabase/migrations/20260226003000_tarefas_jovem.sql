-- =====================================================
-- Tarefas por jovem + notificacoes
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tarefas_jovem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'aberta'
    CHECK (status = ANY (ARRAY['aberta','em_andamento','concluida','cancelada'])),
  prioridade TEXT NOT NULL DEFAULT 'media'
    CHECK (prioridade = ANY (ARRAY['baixa','media','alta'])),
  atribuida_para UUID REFERENCES auth.users(id),
  criada_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE
);

CREATE INDEX IF NOT EXISTS idx_tarefas_jovem_jovem_id ON public.tarefas_jovem(jovem_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_jovem_atribuida_para ON public.tarefas_jovem(atribuida_para);

COMMENT ON TABLE public.tarefas_jovem IS 'Tarefas internas associadas a um jovem.';
COMMENT ON COLUMN public.tarefas_jovem.titulo IS 'Resumo da tarefa.';
COMMENT ON COLUMN public.tarefas_jovem.status IS 'Status do fluxo: aberta, em andamento, concluida ou cancelada.';
COMMENT ON COLUMN public.tarefas_jovem.prioridade IS 'Nivel de prioridade (baixa, media, alta).';

ALTER TABLE public.tarefas_jovem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read tarefas"
  ON public.tarefas_jovem
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can insert tarefas"
  ON public.tarefas_jovem
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid())
    AND criada_por = auth.uid()
  );

CREATE POLICY "Assigned or admin can update tarefas"
  ON public.tarefas_jovem
  FOR UPDATE
  TO authenticated
  USING (
    (atribuida_para IS NOT NULL AND atribuida_para = auth.uid())
    OR (criada_por IS NOT NULL AND criada_por = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  )
  WITH CHECK (
    (atribuida_para IS NOT NULL AND atribuida_para = auth.uid())
    OR (criada_por IS NOT NULL AND criada_por = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  );

-- Ampliar tipos aceitos em notificacoes internas para incluir tarefas
ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_related_entity_type_check;

ALTER TABLE public.notificacoes_internas
  ADD CONSTRAINT notificacoes_internas_related_entity_type_check
  CHECK (
    related_entity_type = ANY (
      ARRAY['intervencao','avaliacao','documento','status_change','tarefa']
    )
  );

-- Helper para enviar notificacao para todos os papeis de um usuario
CREATE OR REPLACE FUNCTION public.send_tarefa_notification(
  p_jovem_id UUID,
  p_tarefa_id UUID,
  p_user_id UUID,
  p_mensagem TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles app_role[];
  v_role app_role;
BEGIN
  IF p_user_id IS NULL OR p_mensagem IS NULL THEN
    RETURN;
  END IF;

  SELECT array_agg(role)::app_role[]
  INTO v_roles
  FROM public.user_roles
  WHERE user_id = p_user_id;

  IF v_roles IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_role IN ARRAY v_roles LOOP
    PERFORM public.create_internal_notification(
      p_jovem_id,
      'tarefa',
      p_tarefa_id,
      p_mensagem,
      v_role
    );
  END LOOP;
END;
$$;

-- Trigger para criar notificacoes ao atribuir ou mudar status
CREATE OR REPLACE FUNCTION public.notify_tarefa_jovem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome_jovem TEXT;
  v_mensagem TEXT;
BEGIN
  SELECT nome_completo
  INTO v_nome_jovem
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.atribuida_para IS NOT NULL THEN
      v_mensagem := format('Nova tarefa "%s" atribuida para %s', NEW.titulo, COALESCE(v_nome_jovem, 'o jovem'));
      PERFORM public.send_tarefa_notification(NEW.jovem_id, NEW.id, NEW.atribuida_para, v_mensagem);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.atribuida_para IS DISTINCT FROM OLD.atribuida_para AND NEW.atribuida_para IS NOT NULL THEN
    v_mensagem := format('Voce recebeu a tarefa "%s" relacionada a %s', NEW.titulo, COALESCE(v_nome_jovem, 'o jovem'));
    PERFORM public.send_tarefa_notification(NEW.jovem_id, NEW.id, NEW.atribuida_para, v_mensagem);
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.atribuida_para IS NOT NULL THEN
    v_mensagem := format('Status da tarefa "%s" atualizado para %s', NEW.titulo, NEW.status);
    PERFORM public.send_tarefa_notification(NEW.jovem_id, NEW.id, NEW.atribuida_para, v_mensagem);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_tarefas_jovem
AFTER INSERT OR UPDATE ON public.tarefas_jovem
FOR EACH ROW EXECUTE FUNCTION public.notify_tarefa_jovem();
