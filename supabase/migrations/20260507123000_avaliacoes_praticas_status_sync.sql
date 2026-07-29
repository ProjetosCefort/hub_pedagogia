CREATE OR REPLACE FUNCTION public.sync_avaliacao_pratica_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'cancelada' THEN
    RETURN NEW;
  END IF;

  IF NEW.data_validacao IS NOT NULL OR NEW.status = 'validada' THEN
    NEW.status := 'validada';
    RETURN NEW;
  END IF;

  IF NEW.proxima_data_envio IS NOT NULL AND NEW.proxima_data_envio < CURRENT_DATE THEN
    NEW.status := 'atrasada';
    RETURN NEW;
  END IF;

  IF NEW.data_resposta IS NOT NULL OR COALESCE(BTRIM(NEW.parecer_empresa), '') <> '' THEN
    NEW.status := 'respondida';
    RETURN NEW;
  END IF;

  NEW.status := 'solicitada';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_avaliacao_pratica_status ON public.avaliacoes_praticas;
CREATE TRIGGER trg_sync_avaliacao_pratica_status
BEFORE INSERT OR UPDATE ON public.avaliacoes_praticas
FOR EACH ROW
EXECUTE FUNCTION public.sync_avaliacao_pratica_status();

UPDATE public.avaliacoes_praticas
SET
  status = CASE
    WHEN status = 'cancelada' THEN 'cancelada'
    WHEN data_validacao IS NOT NULL OR status = 'validada' THEN 'validada'
    WHEN proxima_data_envio IS NOT NULL AND proxima_data_envio < CURRENT_DATE THEN 'atrasada'
    WHEN data_resposta IS NOT NULL OR COALESCE(BTRIM(parecer_empresa), '') <> '' THEN 'respondida'
    ELSE 'solicitada'
  END,
  updated_at = now()
WHERE status IS DISTINCT FROM CASE
  WHEN status = 'cancelada' THEN 'cancelada'
  WHEN data_validacao IS NOT NULL OR status = 'validada' THEN 'validada'
  WHEN proxima_data_envio IS NOT NULL AND proxima_data_envio < CURRENT_DATE THEN 'atrasada'
  WHEN data_resposta IS NOT NULL OR COALESCE(BTRIM(parecer_empresa), '') <> '' THEN 'respondida'
  ELSE 'solicitada'
END;

COMMENT ON FUNCTION public.sync_avaliacao_pratica_status() IS
  'Sincroniza automaticamente o status da avaliacao pratica com base em resposta, validacao, cancelamento e vencimento da proxima data de envio.';
