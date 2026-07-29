-- =====================================================
-- SISTEMA DE AUDITORIA GLOBAL
-- Registra todas as ações importantes do sistema
-- =====================================================

-- Enum para tipos de ação
CREATE TYPE public.audit_action_type AS ENUM ('create', 'update', 'delete', 'status_change');

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entidade afetada
  entity_type TEXT NOT NULL, -- 'intervencoes', 'avaliacoes_pedagogicas', 'avaliacoes_socioeconomicas', 'encaminhamentos', 'jovens'
  entity_id UUID NOT NULL,
  
  -- Ação realizada
  action_type public.audit_action_type NOT NULL,
  
  -- Usuário que realizou a ação
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Timestamp
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Diferenças (JSON com old/new values)
  diff_json JSONB,
  
  -- Metadados adicionais (opcional)
  metadata JSONB
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON public.audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON public.audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_composite ON public.audit_logs(entity_type, entity_id);

-- Índice GIN para busca em diff_json
CREATE INDEX IF NOT EXISTS idx_audit_logs_diff_json ON public.audit_logs USING GIN(diff_json);

-- RLS para auditoria (apenas admins podem ler)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ler logs de auditoria
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Política: Usuários autenticados podem inserir logs (via função)
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Função helper para registrar logs de auditoria
CREATE OR REPLACE FUNCTION public.log_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action_type public.audit_action_type,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_log_id UUID;
  v_diff_json JSONB;
BEGIN
  -- Obter usuário atual
  v_current_user_id := auth.uid();
  
  -- Se não há usuário autenticado, usar sistema
  IF v_current_user_id IS NULL THEN
    v_current_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Calcular diferenças se ambos old e new existem
  IF p_old_data IS NOT NULL AND p_new_data IS NOT NULL THEN
    -- Criar objeto com diferenças
    v_diff_json := jsonb_build_object(
      'old', p_old_data,
      'new', p_new_data
    );
  ELSIF p_new_data IS NOT NULL THEN
    -- Apenas novos dados (create)
    v_diff_json := jsonb_build_object('new', p_new_data);
  ELSIF p_old_data IS NOT NULL THEN
    -- Apenas dados antigos (delete)
    v_diff_json := jsonb_build_object('old', p_old_data);
  END IF;

  -- Inserir log
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action_type,
    changed_by,
    changed_at,
    diff_json,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_action_type,
    v_current_user_id,
    now(),
    v_diff_json,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, UUID, public.audit_action_type, JSONB, JSONB, JSONB) TO authenticated;

-- Comentários para documentação
COMMENT ON TABLE public.audit_logs IS 'Logs de auditoria de todas as ações importantes do sistema';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Tipo da entidade afetada (ex: intervencoes, avaliacoes_pedagogicas)';
COMMENT ON COLUMN public.audit_logs.entity_id IS 'ID da entidade afetada';
COMMENT ON COLUMN public.audit_logs.action_type IS 'Tipo de ação: create, update, delete, status_change';
COMMENT ON COLUMN public.audit_logs.diff_json IS 'Diferenças entre valores antigos e novos (JSON)';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Metadados adicionais (opcional)';
COMMENT ON FUNCTION public.log_audit IS 'Função helper para registrar logs de auditoria';
