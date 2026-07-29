-- Part 2: Use new enum values (run after part 1 is committed).

ALTER TABLE public.jovens
  ALTER COLUMN status SET DEFAULT 'active_apprentice';

UPDATE public.jovens
SET status = CASE status::text
  WHEN 'ativo' THEN 'active_apprentice'::public.jovem_status
  WHEN 'inativo' THEN 'inactive'::public.jovem_status
  WHEN 'desligado' THEN 'terminated'::public.jovem_status
  WHEN 'formado' THEN 'completed_program'::public.jovem_status
  ELSE status
END
WHERE status::text IN ('ativo','inativo','desligado','formado');

DO $mig$
BEGIN
  IF to_regclass('public.jovem_status_history') IS NOT NULL THEN
    UPDATE public.jovem_status_history
    SET previous_status = CASE previous_status::text
      WHEN 'ativo' THEN 'active_apprentice'::public.jovem_status
      WHEN 'inativo' THEN 'inactive'::public.jovem_status
      WHEN 'desligado' THEN 'terminated'::public.jovem_status
      WHEN 'formado' THEN 'completed_program'::public.jovem_status
      ELSE previous_status
    END
    WHERE previous_status::text IN ('ativo','inativo','desligado','formado');

    UPDATE public.jovem_status_history
    SET new_status = CASE new_status::text
      WHEN 'ativo' THEN 'active_apprentice'::public.jovem_status
      WHEN 'inativo' THEN 'inactive'::public.jovem_status
      WHEN 'desligado' THEN 'terminated'::public.jovem_status
      WHEN 'formado' THEN 'completed_program'::public.jovem_status
      ELSE new_status
    END
    WHERE new_status::text IN ('ativo','inativo','desligado','formado');
  END IF;
END;
$mig$;

CREATE OR REPLACE FUNCTION public.auto_migrate_inscricao_when_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.jovem_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status IN ('approved', 'active_apprentice') THEN
    PERFORM public.migrate_inscricao_to_jovem(NEW.id, NULL, NULL);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS auto_migrate_inscricao_when_approved ON public.inscricoes_jovens_aprendizes;
DROP TRIGGER IF EXISTS auto_migrate_inscricao_when_approved_insert ON public.inscricoes_jovens_aprendizes;

CREATE TRIGGER auto_migrate_inscricao_when_approved
  AFTER UPDATE OF status ON public.inscricoes_jovens_aprendizes
  FOR EACH ROW
  WHEN (
    NEW.jovem_id IS NULL
    AND NEW.status IN ('approved', 'active_apprentice')
    AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.status IS NULL)
  )
  EXECUTE FUNCTION public.auto_migrate_inscricao_when_approved();

CREATE TRIGGER auto_migrate_inscricao_when_approved_insert
  AFTER INSERT ON public.inscricoes_jovens_aprendizes
  FOR EACH ROW
  WHEN (
    NEW.jovem_id IS NULL
    AND NEW.status IN ('approved', 'active_apprentice')
  )
  EXECUTE FUNCTION public.auto_migrate_inscricao_when_approved();

CREATE OR REPLACE FUNCTION public._mig_run_auto_migrate_inscricoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT id
    FROM public.inscricoes_jovens_aprendizes
    WHERE jovem_id IS NULL
      AND status IN ('approved', 'active_apprentice')
  LOOP
    BEGIN
      PERFORM public.migrate_inscricao_to_jovem(rec.id, NULL, NULL);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Falha ao migrar inscrição %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$fn$;

SELECT public._mig_run_auto_migrate_inscricoes();

DROP FUNCTION public._mig_run_auto_migrate_inscricoes();
