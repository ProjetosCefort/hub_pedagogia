-- =====================================================
-- FUNÇÃO: Timeline Unificada do Prontuário
-- Combina intervenções, avaliações pedagógicas, 
-- avaliações socioeconômicas e encaminhamentos em uma única query
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_timeline_prontuario(
  p_jovem_id UUID,
  p_tipo_evento TEXT DEFAULT NULL,
  p_periodo_dias INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tipo_evento TEXT,
  data_evento TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  titulo TEXT,
  resumo TEXT,
  responsavel_id UUID,
  created_by UUID,
  status_jovem TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_jovem TEXT;
  v_data_inicio TIMESTAMPTZ;
BEGIN
  -- Obter status atual do jovem
  SELECT status::TEXT INTO v_status_jovem
  FROM public.jovens
  WHERE id = p_jovem_id;
  
  -- Calcular data de início do período (se especificado)
  IF p_periodo_dias IS NOT NULL THEN
    v_data_inicio := NOW() - (p_periodo_dias || ' days')::INTERVAL;
  END IF;
  
  RETURN QUERY
  WITH timeline_unificada AS (
    -- INTERVENÇÕES
    SELECT 
      i.id,
      'intervencao'::TEXT AS tipo_evento,
      i.data_atendimento AS data_evento,
      i.created_at,
      'Intervenção'::TEXT AS titulo,
      LEFT(
        COALESCE(
          CASE 
            WHEN i.motivo_intervencao_id IS NOT NULL THEN
              (SELECT nome FROM config_motivos_intervencao WHERE id = i.motivo_intervencao_id)
            ELSE i.motivo_intervencao
          END,
          ''
        ) || 
        CASE 
          WHEN COALESCE(
            CASE 
              WHEN i.motivo_intervencao_id IS NOT NULL THEN
                (SELECT nome FROM config_motivos_intervencao WHERE id = i.motivo_intervencao_id)
              ELSE i.motivo_intervencao
            END,
            ''
          ) != '' THEN '. '
          ELSE ''
        END || 
        COALESCE(i.descricao_demanda, ''),
        120
      ) AS resumo,
      COALESCE(i.responsavel_id, i.created_by) AS responsavel_id,
      i.created_by,
      v_status_jovem AS status_jovem
    FROM public.intervencoes i
    WHERE i.jovem_id = p_jovem_id
      AND (p_tipo_evento IS NULL OR p_tipo_evento = 'intervencao')
      AND (p_periodo_dias IS NULL OR i.created_at >= v_data_inicio)
    
    UNION ALL
    
    -- AVALIAÇÕES PEDAGÓGICAS
    SELECT 
      ap.id,
      'pedagogica'::TEXT AS tipo_evento,
      ap.data_avaliacao AS data_evento,
      ap.created_at,
      'Avaliação Pedagógica'::TEXT AS titulo,
      LEFT(
        COALESCE(
          CASE 
            WHEN ap.motivo_intervencao_id IS NOT NULL THEN
              'Motivo: ' || (SELECT nome FROM config_motivos_intervencao WHERE id = ap.motivo_intervencao_id)
            WHEN ap.motivo_intervencao IS NOT NULL THEN
              'Motivo: ' || ap.motivo_intervencao
            ELSE ''
          END,
          ''
        ) ||
        CASE 
          WHEN ap.aproveitamento_escolar_id IS NOT NULL THEN
            CASE 
              WHEN COALESCE(
                CASE 
                  WHEN ap.motivo_intervencao_id IS NOT NULL THEN
                    'Motivo: ' || (SELECT nome FROM config_motivos_intervencao WHERE id = ap.motivo_intervencao_id)
                  WHEN ap.motivo_intervencao IS NOT NULL THEN
                    'Motivo: ' || ap.motivo_intervencao
                  ELSE ''
                END,
                ''
              ) != '' THEN '. Classificação: '
              ELSE 'Classificação: '
            END ||
            COALESCE(
              (SELECT nome FROM config_aproveitamento_escolar WHERE id = ap.aproveitamento_escolar_id),
              ''
            )
          ELSE ''
        END,
        120
      ) AS resumo,
      COALESCE(ap.responsavel_id, ap.created_by) AS responsavel_id,
      ap.created_by,
      v_status_jovem AS status_jovem
    FROM public.avaliacoes_pedagogicas ap
    WHERE ap.jovem_id = p_jovem_id
      AND (p_tipo_evento IS NULL OR p_tipo_evento = 'pedagogica')
      AND (p_periodo_dias IS NULL OR ap.created_at >= v_data_inicio)
    
    UNION ALL
    
    -- AVALIAÇÕES SOCIOECONÔMICAS
    SELECT 
      ase.id,
      'socioeconomica'::TEXT AS tipo_evento,
      ase.data_avaliacao AS data_evento,
      ase.created_at,
      'Avaliação Socioeconômica'::TEXT AS titulo,
      LEFT(
        COALESCE(ase.observacoes, 'Avaliação realizada') ||
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM public.avaliacoes_socioeconomicas_registros_sociais asrs
            JOIN public.config_registros_sociais crs ON crs.id = asrs.registro_social_id
            WHERE asrs.avaliacao_socioeconomica_id = ase.id
          ) THEN
            '. Registros: ' || (
              SELECT string_agg(
                COALESCE(crs.sigla, crs.nome),
                ', '
                ORDER BY crs.ordem, crs.nome
              )
              FROM public.avaliacoes_socioeconomicas_registros_sociais asrs
              JOIN public.config_registros_sociais crs ON crs.id = asrs.registro_social_id
              WHERE asrs.avaliacao_socioeconomica_id = ase.id
            )
          ELSE ''
        END,
        120
      ) AS resumo,
      COALESCE(ase.responsavel_id, ase.created_by) AS responsavel_id,
      ase.created_by,
      v_status_jovem AS status_jovem
    FROM public.avaliacoes_socioeconomicas ase
    WHERE ase.jovem_id = p_jovem_id
      AND (p_tipo_evento IS NULL OR p_tipo_evento = 'socioeconomica')
      AND (p_periodo_dias IS NULL OR ase.created_at >= v_data_inicio)
    
    UNION ALL
    
    -- ENCAMINHAMENTOS
    SELECT 
      e.id,
      'encaminhamento'::TEXT AS tipo_evento,
      e.data_encaminhamento AS data_evento,
      e.created_at,
      'Encaminhamento'::TEXT AS titulo,
      LEFT(
        COALESCE(
          CASE 
            WHEN e.modelo_encaminhamento_id IS NOT NULL THEN
              (SELECT nome FROM config_modelos_encaminhamento WHERE id = e.modelo_encaminhamento_id)
            ELSE e.instituicao
          END,
          'Instituição não especificada'
        ) ||
        CASE 
          WHEN e.destino IS NOT NULL AND e.destino != '' THEN
            ': ' || e.destino
          ELSE ''
        END,
        120
      ) AS resumo,
      COALESCE(e.responsavel_id, e.created_by) AS responsavel_id,
      e.created_by,
      v_status_jovem AS status_jovem
    FROM public.encaminhamentos e
    WHERE e.jovem_id = p_jovem_id
      AND (p_tipo_evento IS NULL OR p_tipo_evento = 'encaminhamento')
      AND (p_periodo_dias IS NULL OR e.created_at >= v_data_inicio)
  )
  SELECT 
    tu.id,
    tu.tipo_evento,
    tu.data_evento,
    tu.created_at,
    tu.titulo,
    tu.resumo,
    tu.responsavel_id,
    tu.created_by,
    tu.status_jovem
  FROM timeline_unificada tu
  ORDER BY tu.created_at DESC;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_timeline_prontuario IS
  'Retorna timeline unificada do prontuário com intervenções, avaliações pedagógicas, avaliações socioeconômicas e encaminhamentos. Suporta filtros por tipo de evento e período.';

-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_timeline_prontuario(UUID, TEXT, INTEGER) TO authenticated;
