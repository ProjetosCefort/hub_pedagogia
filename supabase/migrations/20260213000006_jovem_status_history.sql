-- Migration: Histórico de transições de status do jovem
-- Cria tabela de histórico e funções para rastreamento e validação de transições

-- Tabela de histórico de status
CREATE TABLE IF NOT EXISTS public.jovem_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  previous_status public.jovem_status,
  new_status public.jovem_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_jovem_status_history_jovem_id ON public.jovem_status_history(jovem_id);
CREATE INDEX IF NOT EXISTS idx_jovem_status_history_changed_at ON public.jovem_status_history(changed_at DESC);

-- RLS para histórico de status
ALTER TABLE public.jovem_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler histórico de status"
  ON public.jovem_status_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir histórico de status"
  ON public.jovem_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Função para validar transições de status
CREATE OR REPLACE FUNCTION public.validate_jovem_status_transition(
  p_previous_status public.jovem_status,
  p_new_status public.jovem_status,
  p_allow_admin_override BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Se não há mudança, permitir (mas não registrar histórico)
  IF p_previous_status = p_new_status THEN
    RETURN true;
  END IF;

  -- Transições sempre permitidas (progressão natural)
  IF p_previous_status = 'ativo' AND p_new_status IN ('inativo', 'desligado', 'formado') THEN
    RETURN true;
  END IF;

  IF p_previous_status = 'inativo' AND p_new_status IN ('ativo', 'desligado', 'formado') THEN
    RETURN true;
  END IF;

  -- Transições restritas que requerem validação especial
  -- active_apprentice (inscrição) não pode voltar para draft (isso é para inscrições, não jovens)
  -- Mas para jovens: formado não pode voltar para ativo sem override
  IF p_previous_status = 'formado' AND p_new_status = 'ativo' THEN
    RETURN p_allow_admin_override;
  END IF;

  -- Desligado não pode voltar para ativo sem override
  IF p_previous_status = 'desligado' AND p_new_status = 'ativo' THEN
    RETURN p_allow_admin_override;
  END IF;

  -- Qualquer outra transição é permitida por padrão
  RETURN true;
END;
$$;

-- Função para atualizar status com registro de histórico
CREATE OR REPLACE FUNCTION public.update_jovem_status(
  p_jovem_id UUID,
  p_new_status public.jovem_status,
  p_reason TEXT DEFAULT NULL,
  p_allow_admin_override BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_status public.jovem_status;
  v_current_user_id UUID;
  v_history_id UUID;
BEGIN
  -- Obter usuário atual
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Obter status atual
  SELECT status INTO v_previous_status
  FROM public.jovens
  WHERE id = p_jovem_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jovem não encontrado';
  END IF;

  -- Validar transição
  IF NOT public.validate_jovem_status_transition(v_previous_status, p_new_status, p_allow_admin_override) THEN
    RAISE EXCEPTION 'Transição de status inválida: de % para %. Requer override administrativo.', 
      v_previous_status, p_new_status;
  END IF;

  -- Se não há mudança, não registrar histórico mas retornar sucesso
  IF v_previous_status = p_new_status THEN
    RETURN NULL;
  END IF;

  -- Atualizar status do jovem
  UPDATE public.jovens
  SET 
    status = p_new_status,
    updated_at = now()
  WHERE id = p_jovem_id;

  -- Registrar no histórico
  INSERT INTO public.jovem_status_history (
    jovem_id,
    previous_status,
    new_status,
    changed_by,
    changed_at,
    reason
  ) VALUES (
    p_jovem_id,
    v_previous_status,
    p_new_status,
    v_current_user_id,
    now(),
    p_reason
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;

-- Trigger para capturar mudanças diretas de status (fallback)
CREATE OR REPLACE FUNCTION public.log_jovem_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Só registrar se o status realmente mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Verificar se já existe um registro muito recente (dentro de 1 segundo)
    -- Isso evita duplicação quando a função update_jovem_status é chamada
    SELECT COUNT(*) INTO v_existing_count
    FROM public.jovem_status_history
    WHERE jovem_id = NEW.id
      AND previous_status = OLD.status
      AND new_status = NEW.status
      AND changed_at > now() - INTERVAL '1 second';
    
    -- Só inserir se não houver registro recente (evita duplicação)
    IF v_existing_count = 0 THEN
      -- Obter usuário atual
      v_current_user_id := auth.uid();
      
      -- Se não há usuário autenticado, usar sistema
      IF v_current_user_id IS NULL THEN
        v_current_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
      END IF;

      -- Registrar no histórico
      INSERT INTO public.jovem_status_history (
        jovem_id,
        previous_status,
        new_status,
        changed_by,
        changed_at,
        reason
      ) VALUES (
        NEW.id,
        OLD.status,
        NEW.status,
        v_current_user_id,
        now(),
        'Mudança automática via trigger'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_log_jovem_status_change ON public.jovens;
CREATE TRIGGER trigger_log_jovem_status_change
AFTER UPDATE OF status ON public.jovens
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.log_jovem_status_change();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_jovem_status_transition(public.jovem_status, public.jovem_status, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_jovem_status(UUID, public.jovem_status, TEXT, BOOLEAN) TO authenticated;

-- Comentários para documentação
COMMENT ON TABLE public.jovem_status_history IS 'Histórico de todas as transições de status dos jovens';
COMMENT ON COLUMN public.jovem_status_history.previous_status IS 'Status anterior (NULL para primeira entrada)';
COMMENT ON COLUMN public.jovem_status_history.new_status IS 'Novo status após a transição';
COMMENT ON COLUMN public.jovem_status_history.reason IS 'Motivo opcional da mudança de status';
COMMENT ON FUNCTION public.validate_jovem_status_transition IS 'Valida se uma transição de status é permitida';
COMMENT ON FUNCTION public.update_jovem_status IS 'Atualiza o status do jovem e registra no histórico de forma transacional';
