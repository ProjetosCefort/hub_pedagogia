-- In-app notifications refresh (communications + pendências)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.notificacoes_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NULL,
  related_entity_type TEXT NULL,
  related_entity_id UUID NULL,
  mensagem TEXT NOT NULL,
  destinatario_role public.app_role NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL
);

ALTER TABLE public.notificacoes_internas
  ADD COLUMN IF NOT EXISTS created_by UUID NULL;

ALTER TABLE public.notificacoes_internas
  ADD COLUMN IF NOT EXISTS related_entity_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_notificacoes_role_lida
  ON public.notificacoes_internas (destinatario_role, lida, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_jovem_created
  ON public.notificacoes_internas (jovem_id, created_at DESC);

ALTER TABLE public.notificacoes_internas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notificacoes_internas'
      AND policyname = 'Staff enxergam notificações por papel'
  ) THEN
    DROP POLICY "Staff enxergam notificações por papel" ON public.notificacoes_internas;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notificacoes_internas'
      AND policyname = 'Staff inserem notificações'
  ) THEN
    DROP POLICY "Staff inserem notificações" ON public.notificacoes_internas;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notificacoes_internas'
      AND policyname = 'Staff atualizam notificações do próprio papel'
  ) THEN
    DROP POLICY "Staff atualizam notificações do próprio papel" ON public.notificacoes_internas;
  END IF;
END
$$;

CREATE POLICY "Staff read notifications by role"
  ON public.notificacoes_internas
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid())
    AND (
      public.has_role(auth.uid(), destinatario_role)
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Staff create notifications"
  ON public.notificacoes_internas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Staff update notifications"
  ON public.notificacoes_internas
  FOR UPDATE
  TO authenticated
  USING (
    public.has_any_role(auth.uid())
    AND (
      public.has_role(auth.uid(), destinatario_role)
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    public.has_any_role(auth.uid())
    AND (
      public.has_role(auth.uid(), destinatario_role)
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP FUNCTION IF EXISTS public.create_internal_notification(UUID, TEXT, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_internal_notification(UUID, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.create_internal_notification(UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_internal_notification(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_internal_notification(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_internal_notification(UUID, TEXT, UUID, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.create_internal_notification(
  UUID, TEXT, UUID, TEXT, UUID, UUID, TEXT
);
DROP FUNCTION IF EXISTS public.create_internal_notification(
  UUID, TEXT, UUID, TEXT, UUID
);
DROP FUNCTION IF EXISTS public.create_internal_notification(
  UUID, TEXT, UUID, TEXT
);
DROP FUNCTION IF EXISTS public.create_internal_notification(
  UUID, TEXT, UUID
);
DROP FUNCTION IF EXISTS public.create_internal_notification(
  UUID, TEXT
);

CREATE OR REPLACE FUNCTION public.create_internal_notification(
  p_role public.app_role,
  p_message TEXT,
  p_jovem_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_author UUID;
BEGIN
  IF p_role IS NULL OR p_message IS NULL OR btrim(p_message) = '' THEN
    RETURN NULL;
  END IF;

  v_author := auth.uid();

  INSERT INTO public.notificacoes_internas (
    jovem_id,
    related_entity_type,
    related_entity_id,
    mensagem,
    destinatario_role,
    created_by
  ) VALUES (
    p_jovem_id,
    p_entity_type,
    p_entity_id,
    p_message,
    p_role,
    v_author
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.refresh_pendencia_notifications_for_jovem(UUID);

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
  v_message TEXT;
  v_role public.app_role;
  v_active_messages TEXT[] := '{}';
BEGIN
  IF p_jovem_id IS NULL THEN
    RETURN;
  END IF;

  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = p_jovem_id;

  IF v_nome IS NULL THEN
    RETURN;
  END IF;

  SELECT public.get_jovem_pendencias(p_jovem_id) INTO v_pendencias;
  IF v_pendencias IS NULL THEN
    v_pendencias := ARRAY[]::TEXT[];
  END IF;

  FOREACH v_code IN ARRAY v_pendencias LOOP
    v_role := NULL;
    v_message := NULL;

    CASE v_code
      WHEN 'avaliacao_socioeconomica_faltando' THEN
        v_role := 'analista_social';
        v_message := format('Pendência socioeconômica: registrar avaliação para %s', v_nome);
      WHEN 'avaliacao_pedagogica_faltando' THEN
        v_role := 'analista_pedagogico';
        v_message := format('Pendência pedagógica: registrar avaliação para %s', v_nome);
      WHEN 'sem_intervencoes' THEN
        v_role := 'analista_psicossocial';
        v_message := format('Pendência de intervenções: nenhum atendimento registrado para %s', v_nome);
      WHEN 'sem_empresa_aprovado' THEN
        v_role := 'gestor';
        v_message := format('Pendência administrativa: atribuir empresa para %s', v_nome);
      WHEN 'documentos_obrigatorios_faltando' THEN
        v_role := 'gestor';
        v_message := format('Documentos obrigatórios pendentes para %s', v_nome);
    END CASE;

    IF v_role IS NOT NULL AND v_message IS NOT NULL THEN
      v_active_messages := array_append(v_active_messages, v_message);
      IF NOT EXISTS (
        SELECT 1
        FROM public.notificacoes_internas
        WHERE jovem_id = p_jovem_id
          AND destinatario_role = v_role
          AND related_entity_type = 'pendencia'
          AND mensagem = v_message
          AND lida = false
      ) THEN
        PERFORM public.create_internal_notification(
          v_role,
          v_message,
          p_jovem_id,
          'pendencia',
          NULL
        );
      END IF;
    END IF;
  END LOOP;

  UPDATE public.notificacoes_internas
  SET lida = true
  WHERE jovem_id = p_jovem_id
    AND related_entity_type = 'pendencia'
    AND lida = false
    AND (
      array_length(v_active_messages, 1) IS NULL
      OR NOT (mensagem = ANY (v_active_messages))
    );
END;
$$;

DROP FUNCTION IF EXISTS public.notify_internal_note_insert();
CREATE OR REPLACE FUNCTION public.notify_internal_note_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author TEXT;
  v_excerpt TEXT;
BEGIN
  IF NEW.jovem_id IS NULL OR NEW.note IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT nome_completo INTO v_author
  FROM public.profiles
  WHERE id = NEW.created_by;

  v_excerpt := left(coalesce(NEW.note, ''), 160);

  PERFORM public.create_internal_notification(
    'analista_pedagogico',
    format('Nova nota interna (%s): %s', coalesce(v_author, 'Equipe'), v_excerpt),
    NEW.jovem_id,
    'internal_note',
    NEW.id
  );

  PERFORM public.create_internal_notification(
    'analista_social',
    format('Nova nota interna (%s): %s', coalesce(v_author, 'Equipe'), v_excerpt),
    NEW.jovem_id,
    'internal_note',
    NEW.id
  );

  PERFORM public.create_internal_notification(
    'gestor',
    format('Nota interna registrada para %s', coalesce(v_author, 'Equipe')),
    NEW.jovem_id,
    'internal_note',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.notify_status_change_insert();
CREATE OR REPLACE FUNCTION public.notify_status_change_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_msg TEXT;
BEGIN
  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  v_msg := format(
    'Status do jovem %s alterado: %s → %s',
    coalesce(v_nome, 'desconhecido'),
    coalesce(NEW.previous_status::TEXT, 'inicial'),
    NEW.new_status::TEXT
  );

  PERFORM public.create_internal_notification(
    'analista_pedagogico',
    v_msg,
    NEW.jovem_id,
    'status_change',
    NEW.id
  );

  PERFORM public.create_internal_notification(
    'gestor',
    v_msg,
    NEW.jovem_id,
    'status_change',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.notify_roles_for_user(UUID, TEXT, UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.notify_roles_for_user(
  p_user_id UUID,
  p_message TEXT,
  p_jovem_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  IF p_user_id IS NULL OR p_message IS NULL THEN
    RETURN;
  END IF;

  FOR v_role IN
    SELECT role
    FROM public.user_roles
    WHERE user_id = p_user_id
  LOOP
    PERFORM public.create_internal_notification(
      v_role,
      p_message,
      p_jovem_id,
      p_entity_type,
      p_entity_id
    );
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.notify_tarefa_change();
CREATE OR REPLACE FUNCTION public.notify_tarefa_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_msg TEXT;
BEGIN
  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.atribuida_para IS NOT NULL THEN
      v_msg := format(
        'Nova tarefa "%s" para %s',
        NEW.titulo,
        coalesce(v_nome, 'jovem')
      );
      PERFORM public.notify_roles_for_user(
        NEW.atribuida_para,
        v_msg,
        NEW.jovem_id,
        'tarefa',
        NEW.id
      );
    END IF;

    PERFORM public.create_internal_notification(
      'gestor',
      format('Nova tarefa criada para %s', coalesce(v_nome, 'jovem')),
      NEW.jovem_id,
      'tarefa',
      NEW.id
    );
    RETURN NEW;
  END IF;

  IF NEW.atribuida_para IS DISTINCT FROM OLD.atribuida_para THEN
    IF NEW.atribuida_para IS NOT NULL THEN
      v_msg := format(
        'Você recebeu a tarefa "%s" (%s)',
        NEW.titulo,
        coalesce(v_nome, 'jovem')
      );
      PERFORM public.notify_roles_for_user(
        NEW.atribuida_para,
        v_msg,
        NEW.jovem_id,
        'tarefa',
        NEW.id
      );
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_msg := format(
      'Tarefa "%s" atualizada para %s',
      NEW.titulo,
      NEW.status
    );

    IF NEW.atribuida_para IS NOT NULL THEN
      PERFORM public.notify_roles_for_user(
        NEW.atribuida_para,
        v_msg,
        NEW.jovem_id,
        'tarefa',
        NEW.id
      );
    END IF;

    PERFORM public.create_internal_notification(
      'gestor',
      v_msg,
      NEW.jovem_id,
      'tarefa',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.notify_documento_validacao();
CREATE OR REPLACE FUNCTION public.notify_documento_validacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_msg TEXT;
BEGIN
  IF NEW.status_validacao IS DISTINCT FROM COALESCE(OLD.status_validacao, 'pendente') THEN
    SELECT nome_completo INTO v_nome
    FROM public.jovens
    WHERE id = NEW.jovem_id;

    v_msg := format(
      'Documento %s para %s foi marcado como %s',
      coalesce(NEW.nome_arquivo, 'sem nome'),
      coalesce(v_nome, 'jovem'),
      NEW.status_validacao
    );

    PERFORM public.create_internal_notification(
      'analista_pedagogico',
      v_msg,
      NEW.jovem_id,
      'documento',
      NEW.id
    );

    PERFORM public.create_internal_notification(
      'gestor',
      v_msg,
      NEW.jovem_id,
      'documento',
      NEW.id
    );

    PERFORM public.refresh_pendencia_notifications_for_jovem(NEW.jovem_id);
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.internal_notes') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS notify_internal_note_insert ON public.internal_notes';
    EXECUTE 'CREATE TRIGGER notify_internal_note_insert AFTER INSERT ON public.internal_notes FOR EACH ROW EXECUTE FUNCTION public.notify_internal_note_insert()';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.jovem_status_history') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS notify_status_change_insert ON public.jovem_status_history';
    EXECUTE 'CREATE TRIGGER notify_status_change_insert AFTER INSERT ON public.jovem_status_history FOR EACH ROW EXECUTE FUNCTION public.notify_status_change_insert()';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.tarefas_jovem') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS notify_tarefas_jovem ON public.tarefas_jovem';
    EXECUTE 'CREATE TRIGGER notify_tarefas_jovem AFTER INSERT OR UPDATE ON public.tarefas_jovem FOR EACH ROW EXECUTE FUNCTION public.notify_tarefa_change()';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.documentos_jovem') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS notify_documentos_validacao ON public.documentos_jovem';
    EXECUTE 'CREATE TRIGGER notify_documentos_validacao AFTER UPDATE OF status_validacao ON public.documentos_jovem FOR EACH ROW EXECUTE FUNCTION public.notify_documento_validacao()';
  END IF;
END;
$$;
