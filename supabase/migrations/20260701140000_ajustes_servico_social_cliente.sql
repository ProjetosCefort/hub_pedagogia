-- Ajustes solicitados pelo Serviço Social
-- - Agenda para público externo
-- - Orçamento de projetos
-- - Status "em andamento" em certificações
-- - Reforço da tabela de registros sociais das avaliações socioeconômicas

ALTER TABLE public.atendimentos_agendados
  ALTER COLUMN jovem_id DROP NOT NULL;

ALTER TABLE public.atendimentos_agendados
  ADD COLUMN IF NOT EXISTS publico_externo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS publico_nome TEXT,
  ADD COLUMN IF NOT EXISTS publico_contato TEXT,
  ADD COLUMN IF NOT EXISTS publico_descricao TEXT;

ALTER TABLE public.atendimentos_agendados
  DROP CONSTRAINT IF EXISTS atendimentos_agendados_publico_target_check;

ALTER TABLE public.atendimentos_agendados
  ADD CONSTRAINT atendimentos_agendados_publico_target_check
  CHECK (
    (publico_externo = false AND jovem_id IS NOT NULL)
    OR (publico_externo = true AND NULLIF(BTRIM(publico_nome), '') IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_publico_externo
  ON public.atendimentos_agendados(publico_externo);

CREATE TABLE IF NOT EXISTS public.projeto_orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  descritivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_projeto_orcamentos_projeto_id
  ON public.projeto_orcamentos(projeto_id);

ALTER TABLE public.projeto_orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permission can view projeto_orcamentos" ON public.projeto_orcamentos;
DROP POLICY IF EXISTS "Permission can insert projeto_orcamentos" ON public.projeto_orcamentos;
DROP POLICY IF EXISTS "Permission can update projeto_orcamentos" ON public.projeto_orcamentos;
DROP POLICY IF EXISTS "Permission can delete projeto_orcamentos" ON public.projeto_orcamentos;

CREATE POLICY "Permission can view projeto_orcamentos"
  ON public.projeto_orcamentos
  FOR SELECT
  TO authenticated
  USING (public.has_permission('projetos.read'));

CREATE POLICY "Permission can insert projeto_orcamentos"
  ON public.projeto_orcamentos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('projetos.write'));

CREATE POLICY "Permission can update projeto_orcamentos"
  ON public.projeto_orcamentos
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('projetos.write'))
  WITH CHECK (public.has_permission('projetos.write'));

CREATE POLICY "Permission can delete projeto_orcamentos"
  ON public.projeto_orcamentos
  FOR DELETE
  TO authenticated
  USING (public.has_permission('projetos.write'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_orcamentos TO authenticated;

ALTER TABLE public.certificacoes
  DROP CONSTRAINT IF EXISTS certificacoes_status_check;

ALTER TABLE public.certificacoes
  ADD CONSTRAINT certificacoes_status_check
  CHECK (status IN ('vigente', 'em_andamento', 'vencido', 'suspensa', 'cancelada'));

CREATE OR REPLACE FUNCTION public.sync_certificacoes_status_by_validade()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_affected INTEGER := 0;
  v_now DATE := CURRENT_DATE;
BEGIN
  UPDATE public.certificacoes
  SET status = 'vencido',
      updated_at = now()
  WHERE status = 'vigente'
    AND data_validade IS NOT NULL
    AND data_validade < v_now;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.certificacoes
  SET status = 'vigente',
      updated_at = now()
  WHERE status = 'vencido'
    AND (data_validade IS NULL OR data_validade >= v_now);

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  v_count := v_count + v_affected;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_certificacao_status_by_validade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('vigente', 'vencido') THEN
    IF NEW.data_validade IS NOT NULL AND NEW.data_validade < CURRENT_DATE THEN
      NEW.status := 'vencido';
    ELSIF NEW.status = 'vencido'
      AND (NEW.data_validade IS NULL OR NEW.data_validade >= CURRENT_DATE) THEN
      NEW.status := 'vigente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_certificacoes_status_by_validade() TO authenticated;

CREATE TABLE IF NOT EXISTS public.avaliacoes_socioeconomicas_registros_sociais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_socioeconomica_id UUID NOT NULL REFERENCES public.avaliacoes_socioeconomicas(id) ON DELETE CASCADE,
  registro_social_id UUID NOT NULL REFERENCES public.config_registros_sociais(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(avaliacao_socioeconomica_id, registro_social_id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_socio_registros_avaliacao_id
  ON public.avaliacoes_socioeconomicas_registros_sociais(avaliacao_socioeconomica_id);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_socio_registros_registro_id
  ON public.avaliacoes_socioeconomicas_registros_sociais(registro_social_id);

ALTER TABLE public.avaliacoes_socioeconomicas_registros_sociais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with role can view avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais;
DROP POLICY IF EXISTS "Users with role can insert avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais;
DROP POLICY IF EXISTS "Users with role can delete avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais;

CREATE POLICY "Users with role can view avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais
  FOR SELECT TO authenticated
  USING (public.has_permission('avaliacoes_socioeconomicas.read'));

CREATE POLICY "Users with role can insert avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('avaliacoes_socioeconomicas.write'));

CREATE POLICY "Users with role can delete avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais
  FOR DELETE TO authenticated
  USING (public.has_permission('avaliacoes_socioeconomicas.write'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_socioeconomicas_registros_sociais TO authenticated;
