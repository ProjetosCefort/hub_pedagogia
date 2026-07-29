-- =====================================================
-- PENDÊNCIAS DO JOVEM
-- Regras centralizadas no backend para detecção automática
-- de itens pendentes por perfil de jovem
-- =====================================================

-- Códigos de pendência (utilizados pela aplicação):
-- - avaliacao_socioeconomica_faltando
-- - avaliacao_pedagogica_faltando
-- - sem_intervencoes
-- - sem_empresa_aprovado
-- - documentos_obrigatorios_faltando (future-ready)

CREATE OR REPLACE FUNCTION public.get_jovem_pendencias(p_jovem_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendencias TEXT[] := '{}';
  v_status jovem_status;
  v_empresa_id UUID;
BEGIN
  -- Obter status e empresa do jovem
  SELECT j.status, j.empresa_id
  INTO v_status, v_empresa_id
  FROM public.jovens j
  WHERE j.id = p_jovem_id;

  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  -- 1. Avaliação socioeconômica faltando
  IF NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_socioeconomicas
    WHERE jovem_id = p_jovem_id
  ) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_socioeconomica_faltando');
  END IF;

  -- 2. Avaliação pedagógica faltando
  IF NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_pedagogicas
    WHERE jovem_id = p_jovem_id
  ) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_pedagogica_faltando');
  END IF;

  -- 3. Nenhuma intervenção registrada (tipo = 'intervencao')
  IF NOT EXISTS (
    SELECT 1 FROM public.intervencoes
    WHERE jovem_id = p_jovem_id
      AND tipo = 'intervencao'
  ) THEN
    v_pendencias := array_append(v_pendencias, 'sem_intervencoes');
  END IF;

  -- 4. Sem empresa atribuída (se aprovado/ativo)
  IF v_status = 'ativo' AND v_empresa_id IS NULL THEN
    v_pendencias := array_append(v_pendencias, 'sem_empresa_aprovado');
  END IF;

  -- 5. Documentos obrigatórios faltando (future-ready: estrutura preparada)
  -- Quando implementado, validar contra config_documentos_obrigatorios ou similar
  -- Por ora, não adiciona nenhum item

  RETURN v_pendencias;
END;
$$;

COMMENT ON FUNCTION public.get_jovem_pendencias(UUID) IS
  'Retorna array de códigos de pendências para um jovem. Regras: avaliação socioeconômica, pedagógica, intervenções, empresa (se ativo), documentos (future).';


-- Função em batch para lista de jovens (evita N+1)
CREATE OR REPLACE FUNCTION public.get_pendencias_por_jovens(p_jovem_ids UUID[])
RETURNS TABLE (jovem_id UUID, pendencias TEXT[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_jovem_ids IS NULL OR array_length(p_jovem_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT j.id AS jovem_id, public.get_jovem_pendencias(j.id) AS pendencias
  FROM public.jovens j
  WHERE j.id = ANY(p_jovem_ids);
END;
$$;

COMMENT ON FUNCTION public.get_pendencias_por_jovens(UUID[]) IS
  'Retorna pendências em batch para múltiplos jovens. Usado na listagem.';


-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_jovem_pendencias(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pendencias_por_jovens(UUID[]) TO authenticated;
