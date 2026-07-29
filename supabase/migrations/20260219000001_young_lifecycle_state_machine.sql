-- =====================================================
-- CICLO DE VIDA DO JOVEM Ã¢â‚¬â€œ MÃƒÂQUINA DE ESTADOS FORMAL
-- TransiÃƒÂ§ÃƒÂµes permitidas, histÃƒÂ³rico e change_young_status
-- =====================================================

-- 1) Novo enum com todos os estados do ciclo de vida
CREATE TYPE public.jovem_status_new AS ENUM (
  'draft',
  'completed',
  'under_analysis',
  'pending_documents',
  'approved',
  'rejected',
  'active_apprentice',
  'inactive',
  'terminated',
  'completed_program'
);

-- 2) Migrar coluna jovens.status para o novo enum (mapeamento legado)
DROP TRIGGER IF EXISTS trigger_log_jovem_status_change ON public.jovens;
DROP TRIGGER IF EXISTS trigger_check_jovem_status_transition ON public.jovens;

ALTER TABLE public.jovens
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.jovens
  ALTER COLUMN status TYPE public.jovem_status_new
  USING (
    CASE status::text
      WHEN 'ativo' THEN 'active_apprentice'::public.jovem_status_new
      WHEN 'inativo' THEN 'inactive'::public.jovem_status_new
      WHEN 'desligado' THEN 'terminated'::public.jovem_status_new
      WHEN 'formado' THEN 'completed_program'::public.jovem_status_new
      ELSE 'active_apprentice'::public.jovem_status_new
    END
  );

ALTER TABLE public.jovens
  ALTER COLUMN status SET DEFAULT 'active_apprentice'::public.jovem_status_new;

-- 3) Migrar jovem_status_history
ALTER TABLE public.jovem_status_history
  ALTER COLUMN previous_status TYPE public.jovem_status_new
  USING (
    CASE previous_status::text
      WHEN 'ativo' THEN 'active_apprentice'::public.jovem_status_new
      WHEN 'inativo' THEN 'inactive'::public.jovem_status_new
      WHEN 'desligado' THEN 'terminated'::public.jovem_status_new
      WHEN 'formado' THEN 'completed_program'::public.jovem_status_new
      ELSE NULL
    END
  );

ALTER TABLE public.jovem_status_history
  ALTER COLUMN new_status TYPE public.jovem_status_new
  USING (
    CASE new_status::text
      WHEN 'ativo' THEN 'active_apprentice'::public.jovem_status_new
      WHEN 'inativo' THEN 'inactive'::public.jovem_status_new
      WHEN 'desligado' THEN 'terminated'::public.jovem_status_new
      WHEN 'formado' THEN 'completed_program'::public.jovem_status_new
      ELSE 'active_apprentice'::public.jovem_status_new
    END
  );

-- 4) Remover tipo antigo e renomear o novo para jovem_status
DROP FUNCTION IF EXISTS public.change_young_status(UUID, public.jovem_status, TEXT);
DROP FUNCTION IF EXISTS public.update_jovem_status(UUID, public.jovem_status, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.validate_jovem_status_transition(public.jovem_status, public.jovem_status, BOOLEAN);

DROP TYPE public.jovem_status;
ALTER TYPE public.jovem_status_new RENAME TO jovem_status;

-- 5) ValidaÃƒÂ§ÃƒÂ£o estrita: apenas transiÃƒÂ§ÃƒÂµes permitidas
-- draft Ã¢â€ â€™ completed
-- completed Ã¢â€ â€™ under_analysis
-- under_analysis Ã¢â€ â€™ pending_documents | approved | rejected
-- pending_documents Ã¢â€ â€™ under_analysis
-- approved Ã¢â€ â€™ active_apprentice
-- active_apprentice Ã¢â€ â€™ inactive | terminated | completed_program
CREATE OR REPLACE FUNCTION public.validate_jovem_status_transition(
  p_previous_status public.jovem_status,
  p_new_status public.jovem_status,
  p_allow_admin_override BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_previous_status = p_new_status THEN
    RETURN true;
  END IF;

  -- TransiÃƒÂ§ÃƒÂµes permitidas (state machine explÃƒÂ­cita)
  CASE p_previous_status
    WHEN 'draft' THEN
      RETURN p_new_status = 'completed';
    WHEN 'completed' THEN
      RETURN p_new_status = 'under_analysis';
    WHEN 'under_analysis' THEN
      RETURN p_new_status IN ('pending_documents', 'approved', 'rejected');
    WHEN 'pending_documents' THEN
      RETURN p_new_status = 'under_analysis';
    WHEN 'approved' THEN
      RETURN p_new_status = 'active_apprentice';
    WHEN 'active_apprentice' THEN
      RETURN p_new_status IN ('inactive', 'terminated', 'completed_program');
    WHEN 'inactive' THEN
      -- Opcional: permitir voltar para active_apprentice com override
      RETURN (p_new_status = 'active_apprentice' AND p_allow_admin_override);
    WHEN 'rejected', 'terminated', 'completed_program' THEN
      RETURN false;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- 6) Atualizar status com histÃƒÂ³rico (previous_status, new_status, changed_by, changed_at, reason)
CREATE OR REPLACE FUNCTION public.update_jovem_status(
  p_jovem_id UUID,
  p_new_status public.jovem_status,
  p_reason TEXT DEFAULT NULL,
  p_allow_admin_override BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_status public.jovem_status;
  v_current_user_id UUID;
  v_history_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'UsuÃƒÂ¡rio nÃƒÂ£o autenticado';
  END IF;

  SELECT status INTO v_previous_status
  FROM public.jovens
  WHERE id = p_jovem_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jovem nÃƒÂ£o encontrado';
  END IF;

  IF NOT public.validate_jovem_status_transition(v_previous_status, p_new_status, p_allow_admin_override) THEN
    RAISE EXCEPTION 'TransiÃƒÂ§ÃƒÂ£o de status invÃƒÂ¡lida: de % para %. Apenas transiÃƒÂ§ÃƒÂµes da mÃƒÂ¡quina de estados sÃƒÂ£o permitidas.',
      v_previous_status, p_new_status;
  END IF;

  IF v_previous_status = p_new_status THEN
    RETURN NULL;
  END IF;

  UPDATE public.jovens
  SET status = p_new_status, updated_at = now()
  WHERE id = p_jovem_id;

  INSERT INTO public.jovem_status_history (
    jovem_id, previous_status, new_status, changed_by, changed_at, reason
  ) VALUES (
    p_jovem_id, v_previous_status, p_new_status, v_current_user_id, now(), p_reason
  )
  RETURNING id INTO v_history_id;

  PERFORM public.log_audit(
    'jovens', p_jovem_id, 'status_change',
    jsonb_build_object('status', v_previous_status),
    jsonb_build_object('status', p_new_status),
    jsonb_build_object('reason', p_reason, 'history_id', v_history_id)
  );

  RETURN v_history_id;
END;
$$;

-- 7) FunÃƒÂ§ÃƒÂ£o exposta: change_young_status(jovem_id, new_status, reason)
CREATE OR REPLACE FUNCTION public.change_young_status(
  p_jovem_id UUID,
  p_new_status public.jovem_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.update_jovem_status(p_jovem_id, p_new_status, p_reason, false);
END;
$$;

-- 8) Trigger: bloquear UPDATE direto com transiÃƒÂ§ÃƒÂ£o invÃƒÂ¡lida
CREATE OR REPLACE FUNCTION public.check_jovem_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NOT public.validate_jovem_status_transition(OLD.status, NEW.status, false) THEN
    RAISE EXCEPTION 'TransiÃƒÂ§ÃƒÂ£o de status invÃƒÂ¡lida: de % para %. Use change_young_status ou update_jovem_status.',
      OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_jovem_status_transition ON public.jovens;
CREATE TRIGGER trigger_check_jovem_status_transition
  BEFORE UPDATE OF status ON public.jovens
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.check_jovem_status_transition();

-- 8.1) Trigger de fallback para mudanÃƒÂ§as diretas (usa novo tipo)
CREATE OR REPLACE FUNCTION public.log_jovem_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_existing_count INTEGER;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM public.jovem_status_history
    WHERE jovem_id = NEW.id
      AND previous_status = OLD.status
      AND new_status = NEW.status
      AND changed_at > now() - INTERVAL '1 second';

    IF v_existing_count = 0 THEN
      v_current_user_id := auth.uid();
      IF v_current_user_id IS NULL THEN
        v_current_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
      END IF;

      INSERT INTO public.jovem_status_history (
        jovem_id, previous_status, new_status, changed_by, changed_at, reason
      ) VALUES (
        NEW.id, OLD.status, NEW.status, v_current_user_id, now(), 'MudanÃƒÂ§a automÃƒÂ¡tica via trigger'
      );

      PERFORM public.log_audit(
        'jovens', NEW.id, 'status_change',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        jsonb_build_object('source', 'trigger')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 9) PendÃƒÂªncias: considerar "active_apprentice" como ativo para sem_empresa
CREATE OR REPLACE FUNCTION public.get_jovem_pendencias(p_jovem_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendencias TEXT[] := '{}';
  v_status public.jovem_status;
  v_empresa_id UUID;
BEGIN
  SELECT j.status, j.empresa_id
  INTO v_status, v_empresa_id
  FROM public.jovens j
  WHERE j.id = p_jovem_id;

  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.avaliacoes_socioeconomicas WHERE jovem_id = p_jovem_id) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_socioeconomica_faltando');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.avaliacoes_pedagogicas WHERE jovem_id = p_jovem_id) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_pedagogica_faltando');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.intervencoes WHERE jovem_id = p_jovem_id AND tipo = 'intervencao') THEN
    v_pendencias := array_append(v_pendencias, 'sem_intervencoes');
  END IF;

  IF v_status = 'active_apprentice' AND v_empresa_id IS NULL THEN
    v_pendencias := array_append(v_pendencias, 'sem_empresa_aprovado');
  END IF;

  RETURN v_pendencias;
END;
$$;

-- 10) MigraÃƒÂ§ÃƒÂ£o de inscriÃƒÂ§ÃƒÂ£o para jovem: usar active_apprentice
CREATE OR REPLACE FUNCTION public.migrate_inscricao_to_jovem(inscricao_id UUID, empresa_id_param UUID DEFAULT NULL, turma_id_param UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_jovem_id UUID;
  inscricao_record public.inscricoes_jovens_aprendizes;
  target_status public.jovem_status := 'under_analysis';
BEGIN
  SELECT * INTO inscricao_record
  FROM public.inscricoes_jovens_aprendizes
  WHERE id = inscricao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'InscriÃƒÂ§ÃƒÂ£o nÃƒÂ£o encontrada';
  END IF;

  IF inscricao_record.jovem_id IS NOT NULL THEN
    RETURN inscricao_record.jovem_id;
  END IF;

  -- Mapeia o status inicial do jovem conforme o status atual da inscriÃƒÂ§ÃƒÂ£o
  IF inscricao_record.status = 'approved' THEN
    target_status := 'approved';
  ELSIF inscricao_record.status = 'under_analysis' THEN
    target_status := 'under_analysis';
  ELSIF inscricao_record.status = 'pending_documents' THEN
    target_status := 'pending_documents';
  END IF;

  -- Contratos com data definida jÃƒÂ¡ podem iniciar como active_apprentice
  IF inscricao_record.data_contrato IS NOT NULL THEN
    target_status := 'active_apprentice';
  END IF;

  INSERT INTO public.jovens (
    nome_completo, data_nascimento, cpf, rg, sexo, email, telefone, celular,
    cep, logradouro, numero, complemento, bairro, cidade, estado,
    responsavel_nome, responsavel_telefone, responsavel_parentesco,
    empresa_id, turma_id, status, data_admissao, observacoes, created_by
  ) VALUES (
    inscricao_record.nome_completo,
    inscricao_record.data_nascimento,
    inscricao_record.cpf,
    inscricao_record.rg,
    inscricao_record.sexo,
    inscricao_record.email,
    inscricao_record.contato_2,
    inscricao_record.contato_1,
    inscricao_record.cep,
    inscricao_record.logradouro,
    inscricao_record.numero,
    inscricao_record.complemento,
    inscricao_record.bairro,
    inscricao_record.cidade,
    inscricao_record.estado,
    inscricao_record.responsavel_nome,
    inscricao_record.responsavel_telefone,
    inscricao_record.responsavel_parentesco,
    COALESCE(empresa_id_param, inscricao_record.empresa_id),
    COALESCE(turma_id_param, inscricao_record.turma_id),
    target_status,
    COALESCE(inscricao_record.data_contrato::DATE, CURRENT_DATE),
    inscricao_record.observacoes,
    auth.uid()
  )
  RETURNING id INTO novo_jovem_id;

  UPDATE public.inscricoes_jovens_aprendizes
  SET jovem_id = novo_jovem_id,
      status = CASE
                 WHEN target_status = 'active_apprentice' THEN 'active_apprentice'
                 ELSE inscricao_record.status
               END,
      updated_at = now()
  WHERE id = inscricao_id;

  RETURN novo_jovem_id;
END;
$$;

-- 10.1) Atualizar config padrÃƒÂ£o de status (ativo Ã¢â€ â€™ active_apprentice)
UPDATE public.config_parametros
SET valor = 'active_apprentice'
WHERE chave = 'jovem_status_padrao';

-- 11) PermissÃƒÂµes e comentÃƒÂ¡rios
GRANT EXECUTE ON FUNCTION public.validate_jovem_status_transition(public.jovem_status, public.jovem_status, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_jovem_status(UUID, public.jovem_status, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_young_status(UUID, public.jovem_status, TEXT) TO authenticated;

COMMENT ON FUNCTION public.change_young_status IS 'Altera o status do jovem conforme a mÃƒÂ¡quina de estados; registra previous_status, new_status, changed_by, changed_at e reason no histÃƒÂ³rico';
COMMENT ON FUNCTION public.validate_jovem_status_transition IS 'Valida se a transiÃƒÂ§ÃƒÂ£o de status ÃƒÂ© permitida pela mÃƒÂ¡quina de estados do ciclo de vida do jovem';
COMMENT ON TABLE public.jovem_status_history IS 'HistÃƒÂ³rico de transiÃƒÂ§ÃƒÂµes de status (previous_status, new_status, changed_by, changed_at, reason)';
COMMENT ON COLUMN public.jovem_status_history.reason IS 'Motivo opcional da mudanÃƒÂ§a de status';
COMMENT ON COLUMN public.jovem_status_history.previous_status IS 'Status anterior (NULL na primeira entrada)';
COMMENT ON COLUMN public.jovem_status_history.new_status IS 'Novo status apÃƒÂ³s a transiÃƒÂ§ÃƒÂ£o';
