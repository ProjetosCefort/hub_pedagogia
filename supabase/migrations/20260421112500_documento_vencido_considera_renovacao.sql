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
  v_required_docs TEXT[] := ARRAY[
    'rg',
    'cpf',
    'comprovante_endereco',
    'comprovante_escolaridade',
    'carteira_trabalho'
  ];
  v_tipo_doc TEXT;
  v_missing_docs BOOLEAN := false;
  v_has_expired_docs BOOLEAN := false;
BEGIN
  SELECT j.status, j.empresa_id
  INTO v_status, v_empresa_id
  FROM public.jovens j
  WHERE j.id = p_jovem_id;

  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_socioeconomicas
    WHERE jovem_id = p_jovem_id
  ) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_socioeconomica_faltando');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_pedagogicas
    WHERE jovem_id = p_jovem_id
  ) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_pedagogica_faltando');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.intervencoes
    WHERE jovem_id = p_jovem_id
      AND tipo = 'intervencao'
  ) THEN
    v_pendencias := array_append(v_pendencias, 'sem_intervencoes');
  END IF;

  IF (v_status::text = 'active_apprentice' OR v_status::text = 'ativo') AND v_empresa_id IS NULL THEN
    v_pendencias := array_append(v_pendencias, 'sem_empresa_aprovado');
  END IF;

  FOREACH v_tipo_doc IN ARRAY v_required_docs LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.documentos_jovem dj
      WHERE dj.jovem_id = p_jovem_id
        AND dj.tipo = v_tipo_doc
        AND dj.status_validacao = 'aprovado'
        AND (dj.validade_em IS NULL OR dj.validade_em > CURRENT_DATE)
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM public.documentos_jovem dj
        WHERE dj.jovem_id = p_jovem_id
          AND dj.tipo = v_tipo_doc
          AND dj.status_validacao = 'aprovado'
          AND dj.validade_em IS NOT NULL
          AND dj.validade_em <= CURRENT_DATE
      ) THEN
        v_has_expired_docs := true;
      ELSE
        v_missing_docs := true;
      END IF;
    END IF;
  END LOOP;

  IF v_missing_docs THEN
    v_pendencias := array_append(v_pendencias, 'documentos_obrigatorios_faltando');
  END IF;

  IF v_has_expired_docs THEN
    v_pendencias := array_append(v_pendencias, 'documento_vencido');
  END IF;

  RETURN v_pendencias;
END;
$$;

COMMENT ON FUNCTION public.get_jovem_pendencias(UUID) IS
  'Retorna pendências de um jovem considerando avaliações, intervenções, empresa atribuída e documentos obrigatórios/vencidos. Documento vencido deixa de gerar pendência quando existe documento aprovado e vigente do mesmo tipo.';
