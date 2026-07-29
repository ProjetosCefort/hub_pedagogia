-- P0.1 - Função transacional de transição de status de inscrições

CREATE OR REPLACE FUNCTION public.validate_inscricao_status_transition(
  p_current_status TEXT,
  p_new_status TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_current_status IS NULL OR p_new_status IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_current_status = p_new_status THEN
    RETURN TRUE;
  END IF;

  CASE p_current_status
    WHEN 'draft', 'completed', 'talent_bank' THEN
      RETURN p_new_status IN ('draft', 'completed', 'talent_bank', 'under_analysis');
    WHEN 'under_analysis' THEN
      RETURN p_new_status IN ('draft', 'completed', 'talent_bank', 'approved', 'rejected');
    WHEN 'rejected' THEN
      RETURN p_new_status IN ('talent_bank');
    WHEN 'approved' THEN
      RETURN p_new_status IN ('active_apprentice');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_direct_inscricao_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF current_setting('app.inscricao_status_transition', true) = 'allow' THEN
      RETURN NEW;
    END IF;

    -- Fluxo automático ao concluir inscrição pública (trigger legado)
    IF OLD.status IN ('draft', 'completed')
       AND NEW.status = 'talent_bank'
       AND NEW.step3_completed_at IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Fluxo automático de migração após aprovação
    IF OLD.status = 'approved'
       AND NEW.status = 'active_apprentice'
       AND NEW.jovem_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Mudança direta de status bloqueada. Use a função change_inscricao_status.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_direct_inscricao_status_update ON public.inscricoes_jovens_aprendizes;
CREATE TRIGGER prevent_direct_inscricao_status_update
  BEFORE UPDATE OF status ON public.inscricoes_jovens_aprendizes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_inscricao_status_update();

CREATE OR REPLACE FUNCTION public.change_inscricao_status(
  p_inscricao_id UUID,
  p_new_status TEXT,
  p_motivo TEXT DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL,
  p_origem TEXT DEFAULT 'manual'
) RETURNS public.inscricoes_jovens_aprendizes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inscricao public.inscricoes_jovens_aprendizes;
  v_updated public.inscricoes_jovens_aprendizes;
  v_actor UUID := auth.uid();
  v_note TEXT;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_any_role(v_actor) THEN
    RAISE EXCEPTION 'Sem permissão para alterar status de inscrição' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inscricao
  FROM public.inscricoes_jovens_aprendizes
  WHERE id = p_inscricao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.validate_inscricao_status_transition(v_inscricao.status, p_new_status) THEN
    RAISE EXCEPTION 'Transição inválida: % -> %', v_inscricao.status, p_new_status
      USING ERRCODE = '23514';
  END IF;

  IF p_new_status = 'rejected' AND (p_motivo IS NULL OR btrim(p_motivo) = '') THEN
    RAISE EXCEPTION 'Motivo é obrigatório para reprovação' USING ERRCODE = '23514';
  END IF;

  IF v_inscricao.status = p_new_status THEN
    RETURN v_inscricao;
  END IF;

  v_note := NULL;
  IF p_new_status = 'rejected' THEN
    v_note := format('[REJEITADO] %s', COALESCE(NULLIF(btrim(p_motivo), ''), 'Sem motivo informado'));
  ELSIF p_new_status = 'talent_bank' AND v_inscricao.status = 'rejected' THEN
    v_note := format('[RETORNO AO BANCO] %s', COALESCE(NULLIF(btrim(p_motivo), ''), 'Retorno ao banco de talentos'));
  END IF;

  PERFORM set_config('app.inscricao_status_transition', 'allow', true);

  UPDATE public.inscricoes_jovens_aprendizes
  SET
    status = p_new_status,
    data_aprovacao = CASE
      WHEN p_new_status = 'approved' AND v_inscricao.status <> 'approved' THEN now()
      ELSE data_aprovacao
    END,
    aprovado_por = CASE
      WHEN p_new_status = 'approved' AND v_inscricao.status <> 'approved' THEN v_actor
      ELSE aprovado_por
    END,
    notas_internas = CASE
      WHEN v_note IS NULL THEN notas_internas
      WHEN notas_internas IS NULL OR btrim(notas_internas) = '' THEN v_note
      ELSE notas_internas || E'\n\n' || v_note
    END,
    updated_at = now()
  WHERE id = p_inscricao_id
  RETURNING * INTO v_updated;

  INSERT INTO public.inscricoes_status_history (
    inscricao_id,
    previous_status,
    new_status,
    motivo,
    observacao,
    origem,
    changed_by,
    metadata
  ) VALUES (
    v_updated.id,
    v_inscricao.status,
    p_new_status,
    NULLIF(btrim(p_motivo), ''),
    NULLIF(btrim(p_observacao), ''),
    COALESCE(NULLIF(btrim(p_origem), ''), 'manual'),
    v_actor,
    jsonb_build_object(
      'inscricao_id', v_updated.id,
      'cpf', v_updated.cpf,
      'jovem_id', v_updated.jovem_id,
      'nome_completo', v_updated.nome_completo
    )
  );

  IF p_new_status = 'rejected' THEN
    INSERT INTO public.inscricoes_reprovacoes (
      inscricao_id,
      actor_id,
      motivo,
      observacao,
      origem
    ) VALUES (
      v_updated.id,
      v_actor,
      btrim(p_motivo),
      NULLIF(btrim(p_observacao), ''),
      COALESCE(NULLIF(btrim(p_origem), ''), 'manual')
    );
  ELSIF p_new_status = 'talent_bank' AND v_inscricao.status = 'rejected' THEN
    UPDATE public.inscricoes_reprovacoes r
    SET
      retornada_ao_banco_em = now(),
      retornada_por = v_actor,
      retorno_observacao = COALESCE(NULLIF(btrim(p_observacao), ''), NULLIF(btrim(p_motivo), ''))
    WHERE r.id = (
      SELECT rr.id
      FROM public.inscricoes_reprovacoes rr
      WHERE rr.inscricao_id = v_updated.id
        AND rr.retornada_ao_banco_em IS NULL
      ORDER BY rr.created_at DESC
      LIMIT 1
    );
  END IF;

  PERFORM public.log_audit(
    'inscricoes_jovens_aprendizes',
    v_updated.id,
    'status_change',
    jsonb_build_object('status', v_inscricao.status),
    jsonb_build_object('status', p_new_status),
    jsonb_build_object(
      'motivo', NULLIF(btrim(p_motivo), ''),
      'observacao', NULLIF(btrim(p_observacao), ''),
      'origem', COALESCE(NULLIF(btrim(p_origem), ''), 'manual')
    )
  );

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_inscricao_status_transition(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_inscricao_status(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
