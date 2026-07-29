-- =====================================================
-- Notification triggers for internal notes and status changes
-- =====================================================

DO $$
BEGIN
  IF to_regclass('public.internal_notes') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS notify_internal_note_insert ON public.internal_notes';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.notify_internal_note_insert();

CREATE OR REPLACE FUNCTION public.notify_on_internal_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles public.app_role[] := ARRAY['analista_pedagogico', 'gestor'];
  v_role public.app_role;
  v_nome TEXT;
  v_message TEXT;
BEGIN
  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  v_message := format(
    'Nova nota interna para %s: %s',
    COALESCE(v_nome, 'jovem'),
    LEFT(NEW.note, 160)
  );

  FOREACH v_role IN ARRAY v_roles LOOP
    PERFORM public.create_internal_notification(
      NEW.jovem_id,
      'documento',
      NEW.id,
      v_message,
      v_role,
      NEW.created_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.internal_notes') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS notify_internal_note_insert ON public.internal_notes';
    EXECUTE 'CREATE TRIGGER notify_internal_note_insert AFTER INSERT ON public.internal_notes FOR EACH ROW EXECUTE FUNCTION public.notify_on_internal_note()';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.jovem_status_history') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS notify_status_change_insert ON public.jovem_status_history';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.notify_status_change();

CREATE OR REPLACE FUNCTION public.notify_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles public.app_role[] := ARRAY['analista_pedagogico', 'gestor'];
  v_role public.app_role;
  v_nome TEXT;
  v_message TEXT;
BEGIN
  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  v_message := format(
    'Status do jovem atualizado: %s -> %s',
    COALESCE(NEW.previous_status::TEXT, 'inicial'),
    NEW.new_status::TEXT
  );

  FOREACH v_role IN ARRAY v_roles LOOP
    PERFORM public.create_internal_notification(
      NEW.jovem_id,
      'status_change',
      NEW.id,
      v_message,
      v_role,
      NEW.changed_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.jovem_status_history') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS notify_status_change_insert ON public.jovem_status_history';
    EXECUTE 'CREATE TRIGGER notify_status_change_insert AFTER INSERT ON public.jovem_status_history FOR EACH ROW EXECUTE FUNCTION public.notify_on_status_change()';
  END IF;
END;
$$;
