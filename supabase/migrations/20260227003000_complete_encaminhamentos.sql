-- =====================================================
-- COMPLETA ESTRUTURA DOS ENCAMINHAMENTOS OFICIAIS
-- =====================================================

-- Renomeia campos legados para nomenclatura oficial
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'encaminhamentos'
      AND column_name = 'destino'
  ) THEN
    EXECUTE 'ALTER TABLE public.encaminhamentos RENAME COLUMN destino TO destino_nome';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'encaminhamentos'
      AND column_name = 'instituicao'
  ) THEN
    EXECUTE 'ALTER TABLE public.encaminhamentos RENAME COLUMN instituicao TO destino_instituicao';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'encaminhamentos'
      AND column_name = 'descricao'
  ) THEN
    EXECUTE 'ALTER TABLE public.encaminhamentos RENAME COLUMN descricao TO descricao_encaminhamento';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'encaminhamentos'
      AND column_name = 'profissional_destino'
  ) THEN
    EXECUTE 'ALTER TABLE public.encaminhamentos RENAME COLUMN profissional_destino TO destino_cargo';
  END IF;
END $$;

-- Novos campos
ALTER TABLE public.encaminhamentos
  ADD COLUMN IF NOT EXISTS destino_contato TEXT,
  ADD COLUMN IF NOT EXISTS retorno_previsto DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Garante atualização automática do updated_at
DROP TRIGGER IF EXISTS update_encaminhamentos_updated_at ON public.encaminhamentos;
CREATE TRIGGER update_encaminhamentos_updated_at
  BEFORE UPDATE ON public.encaminhamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK de responsável alinhada a profiles
ALTER TABLE public.encaminhamentos
  DROP CONSTRAINT IF EXISTS encaminhamentos_responsavel_id_fkey;

ALTER TABLE public.encaminhamentos
  ADD CONSTRAINT encaminhamentos_responsavel_id_profiles_fkey
  FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Auditoria automática
DROP TRIGGER IF EXISTS trg_audit_encaminhamentos ON public.encaminhamentos;
CREATE TRIGGER trg_audit_encaminhamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.encaminhamentos
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('encaminhamentos');

-- Notificações internas suportam tipo específico de encaminhamento
ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_related_entity_type_check;

ALTER TABLE public.notificacoes_internas
  ADD CONSTRAINT notificacoes_internas_related_entity_type_check
  CHECK (
    related_entity_type IS NULL
    OR related_entity_type = ANY (ARRAY['intervencao','avaliacao','documento','status_change','tarefa','encaminhamento'])
  );

-- Notificação automática para novos encaminhamentos
CREATE OR REPLACE FUNCTION public.notify_encaminhamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_destino TEXT;
  v_retorno TEXT;
BEGIN
  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  v_destino := COALESCE(NEW.destino_instituicao, 'destino não informado');
  v_retorno := CASE WHEN NEW.retorno_previsto IS NOT NULL THEN TO_CHAR(NEW.retorno_previsto, 'DD/MM/YYYY') ELSE NULL END;

  PERFORM public.create_internal_notification(
    NEW.jovem_id,
    'encaminhamento',
    NEW.id,
    format('Encaminhamento emitido para %s (%s)%s',
      v_destino,
      COALESCE(NEW.destino_nome, 'setor não informado'),
      CASE WHEN v_retorno IS NOT NULL THEN format(' · Retorno %s', v_retorno) ELSE '' END
    ),
    'analista_psicossocial',
    NEW.created_by
  );

  PERFORM public.create_internal_notification(
    NEW.jovem_id,
    'encaminhamento',
    NEW.id,
    format('Encaminhamento registrado para %s', COALESCE(v_nome, 'jovem')),
    'gestor',
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_encaminhamento ON public.encaminhamentos;
CREATE TRIGGER trg_notify_encaminhamento
  AFTER INSERT ON public.encaminhamentos
  FOR EACH ROW EXECUTE FUNCTION public.notify_encaminhamento();

-- Atualiza timeline integrada com novos campos
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
  SELECT status::TEXT INTO v_status_jovem
  FROM public.jovens
  WHERE id = p_jovem_id;

  IF p_periodo_dias IS NOT NULL THEN
    v_data_inicio := NOW() - (p_periodo_dias || ' days')::INTERVAL;
  END IF;

  RETURN QUERY
  WITH timeline_unificada AS (
    -- Intervenções
    SELECT 
      i.id,
      'intervencao'::TEXT AS tipo_evento,
      i.data_atendimento AS data_evento,
      i.created_at,
      'Intervenção'::TEXT AS titulo,
      LEFT(
        CONCAT_WS(' | ',
          CASE 
            WHEN i.motivo_intervencao_id IS NOT NULL THEN (
              SELECT nome FROM public.config_motivos_intervencao WHERE id = i.motivo_intervencao_id
            )
            ELSE i.motivo_intervencao
          END,
          i.descricao_demanda
        ),
        200
      ) AS resumo,
      COALESCE(i.responsavel_id, i.created_by) AS responsavel_id,
      i.created_by,
      v_status_jovem AS status_jovem
    FROM public.intervencoes i
    WHERE i.jovem_id = p_jovem_id
      AND (p_tipo_evento IS NULL OR p_tipo_evento = 'intervencao')
      AND (p_periodo_dias IS NULL OR i.created_at >= v_data_inicio)

    UNION ALL

    -- Avaliações pedagógicas
    SELECT 
      ap.id,
      'pedagogica'::TEXT AS tipo_evento,
      ap.data_avaliacao AS data_evento,
      ap.created_at,
      'Avaliação Pedagógica'::TEXT AS titulo,
      LEFT(
        CONCAT_WS(' | ',
          CASE 
            WHEN ap.motivo_intervencao_id IS NOT NULL THEN 'Motivo: ' || (
              SELECT nome FROM public.config_motivos_intervencao WHERE id = ap.motivo_intervencao_id
            )
            WHEN ap.motivo_intervencao IS NOT NULL THEN 'Motivo: ' || ap.motivo_intervencao
          END,
          CASE 
            WHEN ap.aproveitamento_escolar_id IS NOT NULL THEN 'Classificação: ' || (
              SELECT nome FROM public.config_aproveitamento_escolar WHERE id = ap.aproveitamento_escolar_id
            )
          END,
          CASE WHEN ap.parecer_final IS NOT NULL THEN 'Parecer: ' || ap.parecer_final END
        ),
        200
      ) AS resumo,
      COALESCE(ap.responsavel_id, ap.created_by) AS responsavel_id,
      ap.created_by,
      v_status_jovem AS status_jovem
    FROM public.avaliacoes_pedagogicas ap
    WHERE ap.jovem_id = p_jovem_id
      AND (p_tipo_evento IS NULL OR p_tipo_evento = 'pedagogica')
      AND (p_periodo_dias IS NULL OR ap.created_at >= v_data_inicio)

    UNION ALL

    -- Avaliações socioeconômicas
    SELECT 
      ase.id,
      'socioeconomica'::TEXT AS tipo_evento,
      ase.data_avaliacao AS data_evento,
      ase.created_at,
      'Avaliação Socioeconômica'::TEXT AS titulo,
      LEFT(
        CONCAT_WS(' | ',
          CASE 
            WHEN ase.pcd_status IS NOT NULL THEN 'PCD: ' || CASE ase.pcd_status
              WHEN 'pcd' THEN 'PCD'
              WHEN 'nao_pcd' THEN 'Não PCD'
              WHEN 'em_analise' THEN 'Em análise'
              ELSE INITCAP(ase.pcd_status)
            END
          END,
          CASE WHEN ase.renda_familiar IS NOT NULL THEN 'Renda: R$ ' || TO_CHAR(ase.renda_familiar, 'FM999G999G990D00') END,
          CASE WHEN ase.quantidade_membros IS NOT NULL THEN 'Membros: ' || ase.quantidade_membros::TEXT END,
          CASE WHEN ase.cadunico_status IS NOT NULL THEN 'CadÚnico: ' || INITCAP(ase.cadunico_status) END,
          CASE WHEN ase.cras IS NOT NULL THEN 'CRAS: ' || ase.cras END,
          CASE WHEN ase.creas IS NOT NULL THEN 'CREAS: ' || ase.creas END
        ),
        200
      ) AS resumo,
      COALESCE(ase.responsavel_id, ase.created_by) AS responsavel_id,
      ase.created_by,
      v_status_jovem AS status_jovem
    FROM public.avaliacoes_socioeconomicas ase
    WHERE ase.jovem_id = p_jovem_id
      AND (p_tipo_evento IS NULL OR p_tipo_evento = 'socioeconomica')
      AND (p_periodo_dias IS NULL OR ase.created_at >= v_data_inicio)

    UNION ALL

    -- Encaminhamentos
    SELECT 
      e.id,
      'encaminhamento'::TEXT AS tipo_evento,
      e.data_encaminhamento AS data_evento,
      e.created_at,
      'Encaminhamento'::TEXT AS titulo,
      LEFT(
        CONCAT_WS(' | ',
          CONCAT_WS(' - ', e.destino_instituicao, e.destino_nome),
          CASE WHEN e.retorno_previsto IS NOT NULL THEN 'Retorno: ' || TO_CHAR(e.retorno_previsto, 'DD/MM/YYYY') END
        ),
        200
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

COMMENT ON FUNCTION public.get_timeline_prontuario IS
  'Retorna timeline unificada do prontuário com intervenções, avaliações pedagógicas, socioeconômicas e encaminhamentos, suportando filtros por tipo e período.';
