CREATE OR REPLACE FUNCTION public.normalize_inscricao_current_step()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.current_step := GREATEST(1, LEAST(COALESCE(NEW.current_step, 1), 3));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_inscricao_current_step ON public.inscricoes_jovens_aprendizes;
CREATE TRIGGER trg_normalize_inscricao_current_step
BEFORE INSERT OR UPDATE OF current_step ON public.inscricoes_jovens_aprendizes
FOR EACH ROW
EXECUTE FUNCTION public.normalize_inscricao_current_step();

COMMENT ON FUNCTION public.normalize_inscricao_current_step() IS
  'Normaliza current_step da inscrição pública para o intervalo suportado entre 1 e 3.';
