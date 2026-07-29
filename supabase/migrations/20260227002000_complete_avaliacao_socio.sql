-- =====================================================
-- COMPLETA ESTRUTURA DA AVALIAÇÃO SOCIOECONÔMICA
-- =====================================================

-- Novos campos exigidos pelo documento institucional
ALTER TABLE public.avaliacoes_socioeconomicas
  ADD COLUMN IF NOT EXISTS pcd_status TEXT,
  ADD COLUMN IF NOT EXISTS tipo_deficiencia TEXT,
  ADD COLUMN IF NOT EXISTS problemas_saude TEXT,
  ADD COLUMN IF NOT EXISTS nis TEXT,
  ADD COLUMN IF NOT EXISTS cadunico_status TEXT,
  ADD COLUMN IF NOT EXISTS cras TEXT,
  ADD COLUMN IF NOT EXISTS creas TEXT,
  ADD COLUMN IF NOT EXISTS beneficios_sociais TEXT;

-- Renomeia tipo de moradia para nomenclatura oficial
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'avaliacoes_socioeconomicas'
      AND column_name = 'tipo_moradia'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'avaliacoes_socioeconomicas'
      AND column_name = 'moradia_tipo'
  ) THEN
    EXECUTE 'ALTER TABLE public.avaliacoes_socioeconomicas RENAME COLUMN tipo_moradia TO moradia_tipo';
  END IF;
END $$;

-- Garante JSON estruturado para composição familiar
ALTER TABLE public.avaliacoes_socioeconomicas
  ALTER COLUMN composicao_familiar SET DEFAULT '[]'::jsonb;

UPDATE public.avaliacoes_socioeconomicas
SET composicao_familiar = '[]'::jsonb
WHERE composicao_familiar IS NULL;

ALTER TABLE public.avaliacoes_socioeconomicas
  DROP CONSTRAINT IF EXISTS avaliacoes_socioeconomicas_composicao_familiar_is_array;

ALTER TABLE public.avaliacoes_socioeconomicas
  ADD CONSTRAINT avaliacoes_socioeconomicas_composicao_familiar_is_array
  CHECK (composicao_familiar IS NULL OR jsonb_typeof(composicao_familiar) = 'array');

-- Migra dados legados para os novos campos quando disponível
UPDATE public.avaliacoes_socioeconomicas
SET
  pcd_status = COALESCE(
    pcd_status,
    CASE
      WHEN possui_deficiencia IS TRUE THEN 'pcd'
      WHEN possui_deficiencia IS FALSE THEN 'nao_pcd'
      ELSE NULL
    END
  ),
  tipo_deficiencia = COALESCE(tipo_deficiencia, descricao_deficiencia),
  problemas_saude = COALESCE(
    problemas_saude,
    NULLIF(
      CONCAT_WS(' | ',
        CASE WHEN possui_doenca_cronica THEN COALESCE(descricao_doenca, 'Condição crônica informada') END,
        CASE WHEN acompanhamento_medico THEN COALESCE(descricao_acompanhamento, 'Acompanhamento médico ativo') END
      ),
      ''
    )
  ),
  beneficios_sociais = COALESCE(
    beneficios_sociais,
    NULLIF(
      CONCAT_WS(' | ',
        CASE WHEN recebe_beneficio THEN COALESCE(descricao_beneficio, 'Benefício socioassistencial') END,
        CASE WHEN participa_programa_social THEN COALESCE(descricao_programa, 'Programa social') END
      ),
      ''
    )
  )
WHERE TRUE;

-- Remove colunas legadas substituídas pelos novos campos
ALTER TABLE public.avaliacoes_socioeconomicas
  DROP COLUMN IF EXISTS possui_doenca_cronica,
  DROP COLUMN IF EXISTS descricao_doenca,
  DROP COLUMN IF EXISTS possui_deficiencia,
  DROP COLUMN IF EXISTS descricao_deficiencia,
  DROP COLUMN IF EXISTS acompanhamento_medico,
  DROP COLUMN IF EXISTS descricao_acompanhamento,
  DROP COLUMN IF EXISTS recebe_beneficio,
  DROP COLUMN IF EXISTS descricao_beneficio,
  DROP COLUMN IF EXISTS participa_programa_social,
  DROP COLUMN IF EXISTS descricao_programa;

-- FK de responsável alinhada a profiles
ALTER TABLE public.avaliacoes_socioeconomicas
  DROP CONSTRAINT IF EXISTS avaliacoes_socioeconomicas_responsavel_id_fkey;

ALTER TABLE public.avaliacoes_socioeconomicas
  ADD CONSTRAINT avaliacoes_socioeconomicas_responsavel_id_profiles_fkey
  FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Auditoria automática
DROP TRIGGER IF EXISTS trg_audit_avaliacoes_socioeconomicas ON public.avaliacoes_socioeconomicas;
CREATE TRIGGER trg_audit_avaliacoes_socioeconomicas
  AFTER INSERT OR UPDATE OR DELETE ON public.avaliacoes_socioeconomicas
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('avaliacoes_socioeconomicas');

-- Notificação automática para novas avaliações socioeconômicas
CREATE OR REPLACE FUNCTION public.notify_avaliacao_socioeconomica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_data TEXT;
  v_renda TEXT;
BEGIN
  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  v_data := TO_CHAR(NEW.data_avaliacao, 'DD/MM/YYYY');
  v_renda := CASE WHEN NEW.renda_familiar IS NOT NULL THEN TO_CHAR(NEW.renda_familiar, 'FM999G999G990D00') ELSE NULL END;

  PERFORM public.create_internal_notification(
    NEW.jovem_id,
    'avaliacao',
    NEW.id,
    format('Avaliação socioeconômica registrada para %s em %s%s',
      COALESCE(v_nome, 'jovem'),
      v_data,
      CASE WHEN v_renda IS NOT NULL THEN format(' · Renda: R$ %s', v_renda) ELSE '' END
    ),
    'analista_social',
    NEW.created_by
  );

  PERFORM public.create_internal_notification(
    NEW.jovem_id,
    'avaliacao',
    NEW.id,
    format('Avaliação socioeconômica registrada para %s em %s', COALESCE(v_nome, 'jovem'), v_data),
    'gestor',
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_avaliacao_socioeconomica ON public.avaliacoes_socioeconomicas;
CREATE TRIGGER trg_notify_avaliacao_socioeconomica
  AFTER INSERT ON public.avaliacoes_socioeconomicas
  FOR EACH ROW EXECUTE FUNCTION public.notify_avaliacao_socioeconomica();
