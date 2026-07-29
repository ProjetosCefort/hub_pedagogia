-- =====================================================
-- INTEGRAÇÃO DE MUDANÇAS DE STATUS COM AUDIT LOGS
-- Atualiza função update_jovem_status para registrar em audit_logs
-- =====================================================

-- Atualizar função update_jovem_status para também registrar em audit_logs
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
  -- Obter usuário atual
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Obter status atual
  SELECT status INTO v_previous_status
  FROM public.jovens
  WHERE id = p_jovem_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jovem não encontrado';
  END IF;

  -- Validar transição
  IF NOT public.validate_jovem_status_transition(v_previous_status, p_new_status, p_allow_admin_override) THEN
    RAISE EXCEPTION 'Transição de status inválida: de % para %. Requer override administrativo.', 
      v_previous_status, p_new_status;
  END IF;

  -- Se não há mudança, não registrar histórico mas retornar sucesso
  IF v_previous_status = p_new_status THEN
    RETURN NULL;
  END IF;

  -- Atualizar status do jovem
  UPDATE public.jovens
  SET 
    status = p_new_status,
    updated_at = now()
  WHERE id = p_jovem_id;

  -- Registrar no histórico de status
  INSERT INTO public.jovem_status_history (
    jovem_id,
    previous_status,
    new_status,
    changed_by,
    changed_at,
    reason
  ) VALUES (
    p_jovem_id,
    v_previous_status,
    p_new_status,
    v_current_user_id,
    now(),
    p_reason
  )
  RETURNING id INTO v_history_id;

  -- Registrar no audit_logs
  PERFORM public.log_audit(
    'jovens',
    p_jovem_id,
    'status_change',
    jsonb_build_object('status', v_previous_status),
    jsonb_build_object('status', p_new_status),
    jsonb_build_object('reason', p_reason, 'history_id', v_history_id)
  );

  RETURN v_history_id;
END;
$$;

-- Atualizar trigger para também registrar em audit_logs
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
  -- Só registrar se o status realmente mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Verificar se já existe um registro muito recente (dentro de 1 segundo)
    -- Isso evita duplicação quando a função update_jovem_status é chamada
    SELECT COUNT(*) INTO v_existing_count
    FROM public.jovem_status_history
    WHERE jovem_id = NEW.id
      AND previous_status = OLD.status
      AND new_status = NEW.status
      AND changed_at > now() - INTERVAL '1 second';
    
    -- Só inserir se não houver registro recente (evita duplicação)
    IF v_existing_count = 0 THEN
      -- Obter usuário atual
      v_current_user_id := auth.uid();
      
      -- Se não há usuário autenticado, usar sistema
      IF v_current_user_id IS NULL THEN
        v_current_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
      END IF;

      -- Registrar no histórico de status
      INSERT INTO public.jovem_status_history (
        jovem_id,
        previous_status,
        new_status,
        changed_by,
        changed_at,
        reason
      ) VALUES (
        NEW.id,
        OLD.status,
        NEW.status,
        v_current_user_id,
        now(),
        'Mudança automática via trigger'
      );

      -- Registrar no audit_logs
      PERFORM public.log_audit(
        'jovens',
        NEW.id,
        'status_change',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        jsonb_build_object('source', 'trigger')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
