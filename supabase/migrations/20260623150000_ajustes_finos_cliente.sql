-- =============================================
-- Ajustes finos solicitados pelo cliente
-- =============================================

-- Encaminhamentos: garante coluna usada pelo frontend e pelo modelo configuravel.
ALTER TABLE public.encaminhamentos
  ADD COLUMN IF NOT EXISTS modelo_encaminhamento_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'encaminhamentos_modelo_encaminhamento_id_fkey'
  ) THEN
    ALTER TABLE public.encaminhamentos
      ADD CONSTRAINT encaminhamentos_modelo_encaminhamento_id_fkey
      FOREIGN KEY (modelo_encaminhamento_id)
      REFERENCES public.config_modelos_encaminhamento(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_encaminhamentos_modelo_encaminhamento_id
  ON public.encaminhamentos(modelo_encaminhamento_id)
  WHERE modelo_encaminhamento_id IS NOT NULL;

COMMENT ON COLUMN public.encaminhamentos.modelo_encaminhamento_id IS
  'Modelo configuravel selecionado para preencher o encaminhamento.';

-- Agenda: impede conflitos simultaneos para o mesmo responsavel entre setores.
CREATE OR REPLACE FUNCTION public.prevent_responsavel_agenda_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_range TSTZRANGE;
  v_conflict RECORD;
BEGIN
  IF NEW.status = 'cancelado' OR NEW.responsavel_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_new_range := tstzrange(
    NEW.agendado_para,
    NEW.agendado_para + make_interval(mins => COALESCE(NEW.duracao_minutos, 60)),
    '[)'
  );

  SELECT id, titulo, agendado_para, duracao_minutos
  INTO v_conflict
  FROM public.atendimentos_agendados existing
  WHERE existing.responsavel_id = NEW.responsavel_id
    AND existing.status <> 'cancelado'
    AND existing.id <> NEW.id
    AND tstzrange(
      existing.agendado_para,
      existing.agendado_para + make_interval(mins => COALESCE(existing.duracao_minutos, 60)),
      '[)'
    ) && v_new_range
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Conflito de agenda: o responsavel ja possui "%", agendado para %.',
      COALESCE(v_conflict.titulo, 'outro atendimento'),
      to_char(v_conflict.agendado_para AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_responsavel_agenda_overlap ON public.atendimentos_agendados;
CREATE TRIGGER trg_prevent_responsavel_agenda_overlap
BEFORE INSERT OR UPDATE OF responsavel_id, agendado_para, duracao_minutos, status
ON public.atendimentos_agendados
FOR EACH ROW
EXECUTE FUNCTION public.prevent_responsavel_agenda_overlap();

-- Declaracao escolar: status educacional usado para regra de cobranca.
ALTER TABLE public.jovens
  ADD COLUMN IF NOT EXISTS escolaridade_regular_status TEXT;

ALTER TABLE public.jovens
  DROP CONSTRAINT IF EXISTS jovens_escolaridade_regular_status_check;

ALTER TABLE public.jovens
  ADD CONSTRAINT jovens_escolaridade_regular_status_check
  CHECK (
    escolaridade_regular_status IS NULL
    OR escolaridade_regular_status = ANY (ARRAY['cursando_ensino_regular', 'ensino_medio_completo'])
  );

COMMENT ON COLUMN public.jovens.escolaridade_regular_status IS
  'Indica se o jovem cursa ensino regular ou ja concluiu o ensino medio para controle da declaracao escolar.';

-- Pendencias: comprovante escolar deixa de ser cobrado para ensino medio completo.
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
  v_escolaridade_status TEXT;
  v_required_docs TEXT[] := ARRAY[
    'rg',
    'cpf',
    'comprovante_endereco',
    'carteira_trabalho'
  ];
  v_tipo_doc TEXT;
  v_missing_docs BOOLEAN := false;
  v_has_expired_docs BOOLEAN := false;
BEGIN
  SELECT j.status, j.empresa_id, j.escolaridade_regular_status
  INTO v_status, v_empresa_id, v_escolaridade_status
  FROM public.jovens j
  WHERE j.id = p_jovem_id;

  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  IF v_escolaridade_status IS DISTINCT FROM 'ensino_medio_completo' THEN
    v_required_docs := array_append(v_required_docs, 'comprovante_escolaridade');
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
