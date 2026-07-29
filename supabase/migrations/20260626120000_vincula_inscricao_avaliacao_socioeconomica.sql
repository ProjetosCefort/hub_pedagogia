-- Vincula a pesquisa socioeconomica preenchida na inscricao publica
-- a uma ficha interna de avaliacao socioeconomica do prontuario.

ALTER TABLE public.avaliacoes_socioeconomicas
  ADD COLUMN IF NOT EXISTS inscricao_jovem_aprendiz_id UUID,
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'avaliacoes_socioeconomicas_inscricao_jovem_aprendiz_id_fkey'
  ) THEN
    ALTER TABLE public.avaliacoes_socioeconomicas
      ADD CONSTRAINT avaliacoes_socioeconomicas_inscricao_jovem_aprendiz_id_fkey
      FOREIGN KEY (inscricao_jovem_aprendiz_id)
      REFERENCES public.inscricoes_jovens_aprendizes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_avaliacoes_socioeconomicas_inscricao_unique
  ON public.avaliacoes_socioeconomicas(inscricao_jovem_aprendiz_id)
  WHERE inscricao_jovem_aprendiz_id IS NOT NULL;

ALTER TABLE public.avaliacoes_socioeconomicas
  DROP CONSTRAINT IF EXISTS avaliacoes_socioeconomicas_origem_check;

ALTER TABLE public.avaliacoes_socioeconomicas
  ADD CONSTRAINT avaliacoes_socioeconomicas_origem_check
  CHECK (origem IN ('manual', 'cadastro_publico'));

COMMENT ON COLUMN public.avaliacoes_socioeconomicas.inscricao_jovem_aprendiz_id IS
  'Inscricao publica que originou ou alimenta a ficha socioeconomica interna.';

COMMENT ON COLUMN public.avaliacoes_socioeconomicas.origem IS
  'Origem da ficha: manual ou cadastro_publico.';

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
  IF NEW.origem = 'cadastro_publico' THEN
    RETURN NEW;
  END IF;

  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  v_data := TO_CHAR(NEW.data_avaliacao, 'DD/MM/YYYY');
  v_renda := CASE
    WHEN NEW.renda_familiar IS NOT NULL
      THEN TO_CHAR(NEW.renda_familiar, 'FM999G999G990D00')
    ELSE NULL
  END;

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

CREATE OR REPLACE FUNCTION public.sync_inscricao_socioeconomica_to_avaliacao(p_inscricao_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inscricao public.inscricoes_jovens_aprendizes;
  v_avaliacao_id UUID;
  v_unlinked_count INTEGER;
  v_data_avaliacao TIMESTAMPTZ;
  v_pcd_status TEXT;
  v_tipo_deficiencia TEXT;
  v_problemas_saude TEXT;
  v_beneficios_sociais TEXT;
BEGIN
  SELECT * INTO v_inscricao
  FROM public.inscricoes_jovens_aprendizes
  WHERE id = p_inscricao_id;

  IF NOT FOUND OR v_inscricao.jovem_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_data_avaliacao := COALESCE(
    v_inscricao.step3_completed_at,
    v_inscricao.completed_at,
    v_inscricao.updated_at,
    v_inscricao.created_at,
    now()
  );

  v_pcd_status := CASE
    WHEN COALESCE(v_inscricao.possui_deficiencia, v_inscricao.e_pcd) IS TRUE THEN 'pcd'
    WHEN COALESCE(v_inscricao.possui_deficiencia, v_inscricao.e_pcd) IS FALSE THEN 'nao_pcd'
    ELSE NULL
  END;

  v_tipo_deficiencia := NULLIF(
    CONCAT_WS(' | ',
      NULLIF(v_inscricao.descricao_deficiencia, ''),
      NULLIF(v_inscricao.descricao_pcd, ''),
      NULLIF(v_inscricao.nivel_pcd, '')
    ),
    ''
  );

  v_problemas_saude := NULLIF(
    CONCAT_WS(' | ',
      CASE
        WHEN v_inscricao.possui_doenca_cronica IS TRUE
          THEN COALESCE(NULLIF(v_inscricao.descricao_doenca, ''), 'Possui doenca cronica')
      END,
      CASE
        WHEN v_inscricao.acompanhamento_medico IS TRUE
          THEN COALESCE(NULLIF(v_inscricao.descricao_acompanhamento, ''), 'Possui acompanhamento medico')
      END
    ),
    ''
  );

  v_beneficios_sociais := NULLIF(
    CONCAT_WS(' | ',
      CASE
        WHEN v_inscricao.recebe_beneficio IS TRUE
          THEN COALESCE(NULLIF(v_inscricao.descricao_beneficio, ''), 'Recebe beneficio social')
      END,
      CASE
        WHEN v_inscricao.participa_programa_social IS TRUE
          THEN COALESCE(NULLIF(v_inscricao.descricao_programa, ''), 'Participa de programa social')
      END
    ),
    ''
  );

  SELECT id INTO v_avaliacao_id
  FROM public.avaliacoes_socioeconomicas
  WHERE inscricao_jovem_aprendiz_id = v_inscricao.id
  LIMIT 1;

  IF v_avaliacao_id IS NULL THEN
    SELECT COUNT(*) INTO v_unlinked_count
    FROM public.avaliacoes_socioeconomicas
    WHERE jovem_id = v_inscricao.jovem_id
      AND inscricao_jovem_aprendiz_id IS NULL;

    IF v_unlinked_count = 1 THEN
      SELECT id INTO v_avaliacao_id
      FROM public.avaliacoes_socioeconomicas
      WHERE jovem_id = v_inscricao.jovem_id
        AND inscricao_jovem_aprendiz_id IS NULL
      ORDER BY data_avaliacao DESC, created_at DESC
      LIMIT 1;
    END IF;
  END IF;

  IF v_avaliacao_id IS NULL THEN
    INSERT INTO public.avaliacoes_socioeconomicas (
      jovem_id,
      inscricao_jovem_aprendiz_id,
      origem,
      data_avaliacao,
      pcd_status,
      tipo_deficiencia,
      problemas_saude,
      renda_familiar,
      quantidade_membros,
      moradia_tipo,
      situacao_moradia,
      possui_saneamento,
      possui_energia,
      beneficios_sociais,
      observacoes,
      composicao_familiar,
      created_by
    ) VALUES (
      v_inscricao.jovem_id,
      v_inscricao.id,
      'cadastro_publico',
      v_data_avaliacao,
      v_pcd_status,
      v_tipo_deficiencia,
      v_problemas_saude,
      v_inscricao.renda_familiar,
      v_inscricao.quantidade_membros,
      v_inscricao.tipo_moradia,
      v_inscricao.situacao_moradia,
      COALESCE(v_inscricao.possui_saneamento, true),
      COALESCE(v_inscricao.possui_energia, true),
      v_beneficios_sociais,
      NULLIF(v_inscricao.observacoes, ''),
      COALESCE(v_inscricao.composicao_familiar, '[]'::jsonb),
      auth.uid()
    )
    RETURNING id INTO v_avaliacao_id;
  ELSE
    UPDATE public.avaliacoes_socioeconomicas
    SET
      jovem_id = v_inscricao.jovem_id,
      inscricao_jovem_aprendiz_id = v_inscricao.id,
      origem = 'cadastro_publico',
      data_avaliacao = v_data_avaliacao,
      pcd_status = v_pcd_status,
      tipo_deficiencia = v_tipo_deficiencia,
      problemas_saude = v_problemas_saude,
      renda_familiar = v_inscricao.renda_familiar,
      quantidade_membros = v_inscricao.quantidade_membros,
      moradia_tipo = v_inscricao.tipo_moradia,
      situacao_moradia = v_inscricao.situacao_moradia,
      possui_saneamento = COALESCE(v_inscricao.possui_saneamento, true),
      possui_energia = COALESCE(v_inscricao.possui_energia, true),
      beneficios_sociais = v_beneficios_sociais,
      observacoes = NULLIF(v_inscricao.observacoes, ''),
      composicao_familiar = COALESCE(v_inscricao.composicao_familiar, '[]'::jsonb),
      updated_at = now()
    WHERE id = v_avaliacao_id;
  END IF;

  RETURN v_avaliacao_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_inscricao_socioeconomica_to_avaliacao(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_sync_inscricao_socioeconomica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.jovem_id IS NOT NULL THEN
    PERFORM public.sync_inscricao_socioeconomica_to_avaliacao(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inscricao_socioeconomica ON public.inscricoes_jovens_aprendizes;
CREATE TRIGGER trg_sync_inscricao_socioeconomica
AFTER INSERT OR UPDATE OF
  jovem_id,
  step3_completed_at,
  completed_at,
  composicao_familiar,
  renda_familiar,
  quantidade_membros,
  tipo_moradia,
  situacao_moradia,
  possui_saneamento,
  possui_energia,
  possui_doenca_cronica,
  descricao_doenca,
  possui_deficiencia,
  descricao_deficiencia,
  acompanhamento_medico,
  descricao_acompanhamento,
  recebe_beneficio,
  descricao_beneficio,
  participa_programa_social,
  descricao_programa,
  observacoes,
  e_pcd,
  nivel_pcd,
  descricao_pcd
ON public.inscricoes_jovens_aprendizes
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_inscricao_socioeconomica();

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id
    FROM public.inscricoes_jovens_aprendizes
    WHERE jovem_id IS NOT NULL
  LOOP
    PERFORM public.sync_inscricao_socioeconomica_to_avaliacao(rec.id);
  END LOOP;
END $$;
