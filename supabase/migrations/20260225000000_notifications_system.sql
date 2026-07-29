-- =====================================================
-- Sistema de notificaÃƒÂ§ÃƒÂµes internas
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notificacoes_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID REFERENCES public.jovens(id) ON DELETE CASCADE,
  related_entity_type TEXT NOT NULL CHECK (
    related_entity_type = ANY (ARRAY['intervencao','avaliacao','documento','status_change'])
  ),
  related_entity_id UUID,
  mensagem TEXT NOT NULL,
  destinatario_role public.app_role NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario
  ON public.notificacoes_internas(destinatario_role, lida);

CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at
  ON public.notificacoes_internas(created_at DESC);

ALTER TABLE public.notificacoes_internas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UsuÃƒÂ¡rio pode ler notificaÃƒÂ§ÃƒÂµes do prÃƒÂ³prio papel"
  ON public.notificacoes_internas
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), destinatario_role));

CREATE POLICY "UsuÃƒÂ¡rio pode atualizar notificaÃƒÂ§ÃƒÂµes do prÃƒÂ³prio papel"
  ON public.notificacoes_internas
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), destinatario_role))
  WITH CHECK (public.has_role(auth.uid(), destinatario_role));

-- FunÃƒÂ§ÃƒÂ£o helper para inserir notificaÃƒÂ§ÃƒÂµes
CREATE OR REPLACE FUNCTION public.create_internal_notification(
  p_jovem_id UUID,
  p_related_type TEXT,
  p_related_id UUID,
  p_mensagem TEXT,
  p_role public.app_role
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_mensagem IS NULL OR p_role IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notificacoes_internas (
    jovem_id,
    related_entity_type,
    related_entity_id,
    mensagem,
    destinatario_role
  )
  VALUES (
    p_jovem_id,
    p_related_type,
    p_related_id,
    p_mensagem,
    p_role
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_internal_notification(UUID, TEXT, UUID, TEXT, public.app_role) TO authenticated;

-- =====================================================
-- NotificaÃƒÂ§ÃƒÂµes para pendÃƒÂªncias
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_pendencia_notifications_for_jovem(p_jovem_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendencias TEXT[];
  v_code TEXT;
  v_nome TEXT;
  v_role public.app_role;
  v_type TEXT;
  v_message TEXT;
  v_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_jovem_id IS NULL THEN
    RETURN;
  END IF;

  SELECT nome_completo
  INTO v_nome
  FROM public.jovens
  WHERE id = p_jovem_id;

  IF v_nome IS NULL THEN
    RETURN;
  END IF;

  v_pendencias := public.get_jovem_pendencias(p_jovem_id);

  FOREACH v_code IN ARRAY v_pendencias LOOP
    v_role := NULL;
    v_type := NULL;
    v_message := NULL;

    CASE v_code
      WHEN 'avaliacao_socioeconomica_faltando' THEN
        v_role := 'analista_social';
        v_type := 'avaliacao';
        v_message := format('PendÃƒÂªncia socioeconÃƒÂ´mica: registrar avaliaÃƒÂ§ÃƒÂ£o para %s', v_nome);
      WHEN 'avaliacao_pedagogica_faltando' THEN
        v_role := 'analista_pedagogico';
        v_type := 'avaliacao';
        v_message := format('PendÃƒÂªncia pedagÃƒÂ³gica: registrar avaliaÃƒÂ§ÃƒÂ£o para %s', v_nome);
      WHEN 'sem_intervencoes' THEN
        v_role := 'analista_psicossocial';
        v_type := 'intervencao';
        v_message := format('PendÃƒÂªncia de intervenÃƒÂ§ÃƒÂ£o: nenhum atendimento registrado para %s', v_nome);
      WHEN 'sem_empresa_aprovado' THEN
        v_role := 'gestor';
        v_type := 'documento';
        v_message := format('PendÃƒÂªncia administrativa: atribuir empresa ao jovem %s', v_nome);
    END CASE;

    IF v_role IS NOT NULL AND v_type IS NOT NULL AND v_message IS NOT NULL THEN
      v_messages := array_append(v_messages, v_message);
      IF NOT EXISTS (
        SELECT 1
        FROM public.notificacoes_internas
        WHERE jovem_id = p_jovem_id
          AND related_entity_type = v_type
          AND destinatario_role = v_role
          AND mensagem = v_message
          AND lida = false
      ) THEN
        PERFORM public.create_internal_notification(
          p_jovem_id,
          v_type,
          NULL,
          v_message,
          v_role
        );
      END IF;
    END IF;
  END LOOP;

  UPDATE public.notificacoes_internas
  SET lida = true
  WHERE jovem_id = p_jovem_id
    AND related_entity_type IN ('avaliacao','intervencao','documento')
    AND lida = false
    AND (
      array_length(v_messages, 1) IS NULL
      OR NOT (mensagem = ANY (v_messages))
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_notify_pendencias_by_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target UUID;
BEGIN
  v_target := COALESCE(NEW.jovem_id, OLD.jovem_id);
  PERFORM public.refresh_pendencia_notifications_for_jovem(v_target);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_notify_pendencias_for_jovem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target UUID;
BEGIN
  v_target := COALESCE(NEW.id, OLD.id);
  PERFORM public.refresh_pendencia_notifications_for_jovem(v_target);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER notify_pendencias_intervencoes
AFTER INSERT OR UPDATE OR DELETE ON public.intervencoes
FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_pendencias_by_ref();

CREATE TRIGGER notify_pendencias_avaliacoes_pedagogicas
AFTER INSERT OR DELETE ON public.avaliacoes_pedagogicas
FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_pendencias_by_ref();

CREATE TRIGGER notify_pendencias_avaliacoes_socioeconomicas
AFTER INSERT OR DELETE ON public.avaliacoes_socioeconomicas
FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_pendencias_by_ref();

CREATE TRIGGER notify_pendencias_jovens
AFTER INSERT OR UPDATE OF empresa_id ON public.jovens
FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_pendencias_for_jovem();

-- =====================================================
-- NotificaÃƒÂ§ÃƒÂµes para mudanÃƒÂ§as de status
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_message TEXT;
BEGIN
  SELECT nome_completo
  INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  IF v_nome IS NULL THEN
    RETURN NEW;
  END IF;

  v_message := format(
    'Status do jovem %s alterado de %s para %s',
    v_nome,
    COALESCE(NEW.previous_status::TEXT, 'inicial'),
    NEW.new_status::TEXT
  );

  PERFORM public.create_internal_notification(
    NEW.jovem_id,
    'status_change',
    NEW.id,
    v_message,
    'gestor'
  );

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.jovem_status_history') IS NOT NULL THEN
    CREATE TRIGGER notify_status_change_insert
    AFTER INSERT ON public.jovem_status_history
    FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();
  END IF;
END;
$$;

-- =====================================================
-- NotificaÃƒÂ§ÃƒÂµes para notas internas
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_internal_note_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_roles app_role[];
  v_role app_role;
BEGIN
  SELECT nome_completo
  INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  SELECT array_agg(role)::app_role[]
  INTO v_roles
  FROM public.user_roles
  WHERE user_id = NEW.created_by;

  IF v_roles IS NULL THEN
    v_roles := ARRAY[]::app_role[];
  END IF;

  FOREACH v_role IN ARRAY ARRAY['admin','gestor','analista_pedagogico','analista_social','analista_psicossocial']::app_role[] LOOP
    IF v_role = ANY (v_roles) THEN
      CONTINUE;
    END IF;

    PERFORM public.create_internal_notification(
      NEW.jovem_id,
      'documento',
      NEW.id,
      format('Nova nota interna sobre %s: %s', COALESCE(v_nome, 'jovem'), LEFT(NEW.note, 120)),
      v_role
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.internal_notes') IS NOT NULL THEN
    CREATE TRIGGER notify_internal_note_insert
    AFTER INSERT ON public.internal_notes
    FOR EACH ROW EXECUTE FUNCTION public.notify_internal_note_insert();
  END IF;
END;
$$;
