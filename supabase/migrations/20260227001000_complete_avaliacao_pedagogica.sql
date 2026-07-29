-- =====================================================
-- COMPLETA ESTRUTURA DA AVALIAÇÃO PEDAGÓGICA INDIVIDUAL
-- =====================================================

-- Renomeia coluna legacy para nomenclatura oficial
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'avaliacoes_pedagogicas'
      AND column_name = 'estrategias_resolucao'
  ) THEN
    EXECUTE 'ALTER TABLE public.avaliacoes_pedagogicas RENAME COLUMN estrategias_resolucao TO estrategias_aplicadas';
  END IF;
END $$;

-- Novo campo obrigatório pelo documento institucional
ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS parecer_final TEXT;

-- FK de responsável passa a referenciar profiles (mantendo compatibilidade com auth.users)
ALTER TABLE public.avaliacoes_pedagogicas
  DROP CONSTRAINT IF EXISTS avaliacoes_pedagogicas_responsavel_id_fkey;

ALTER TABLE public.avaliacoes_pedagogicas
  ADD CONSTRAINT avaliacoes_pedagogicas_responsavel_id_profiles_fkey
  FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Garante que o tipo de ação de auditoria exista no schema público
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'audit_action_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.audit_action_type AS ENUM ('create', 'update', 'delete', 'status_change');
  END IF;
END;
$$;

-- Função genérica para auditoria (reutilizada pelos demais módulos)
CREATE OR REPLACE FUNCTION public.log_entity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity TEXT;
  v_action public.audit_action_type;
  v_old JSONB;
  v_new JSONB;
  v_entity_id UUID;
BEGIN
  v_entity := TG_ARGV[0];
  IF v_entity IS NULL THEN
    RAISE EXCEPTION 'Entity type must be informed for log_entity_change trigger';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_entity_id := NEW.id;
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := NEW.id;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSE
    v_action := 'delete';
    v_entity_id := OLD.id;
    v_old := to_jsonb(OLD);
  END IF;

  PERFORM public.log_audit(
    v_entity,
    v_entity_id,
    v_action,
    v_old,
    v_new,
    NULL
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Aplica trigger de auditoria para avaliações pedagógicas
DROP TRIGGER IF EXISTS trg_audit_avaliacoes_pedagogicas ON public.avaliacoes_pedagogicas;
CREATE TRIGGER trg_audit_avaliacoes_pedagogicas
  AFTER INSERT OR UPDATE OR DELETE ON public.avaliacoes_pedagogicas
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('avaliacoes_pedagogicas');

-- Notificação automática para novas avaliações pedagógicas
CREATE OR REPLACE FUNCTION public.notify_avaliacao_pedagogica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_classificacao TEXT;
  v_data TEXT;
BEGIN
  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = NEW.jovem_id;

  SELECT nome INTO v_classificacao
  FROM public.config_aproveitamento_escolar
  WHERE id = NEW.aproveitamento_escolar_id;

  v_data := TO_CHAR(NEW.data_avaliacao, 'DD/MM/YYYY');

  PERFORM public.create_internal_notification(
    NEW.jovem_id,
    'avaliacao',
    NEW.id,
    format('Avaliação pedagógica registrada para %s em %s%s',
      COALESCE(v_nome, 'jovem'),
      v_data,
      CASE WHEN v_classificacao IS NOT NULL THEN format(' · Classificação: %s', v_classificacao) ELSE '' END
    ),
    'analista_pedagogico',
    NEW.created_by
  );

  PERFORM public.create_internal_notification(
    NEW.jovem_id,
    'avaliacao',
    NEW.id,
    format('Avaliação pedagógica registrada para %s em %s', COALESCE(v_nome, 'jovem'), v_data),
    'gestor',
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_avaliacao_pedagogica ON public.avaliacoes_pedagogicas;
CREATE TRIGGER trg_notify_avaliacao_pedagogica
  AFTER INSERT ON public.avaliacoes_pedagogicas
  FOR EACH ROW EXECUTE FUNCTION public.notify_avaliacao_pedagogica();
