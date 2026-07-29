-- =====================================================
-- Certificacoes: status automatico "vencido" por validade
-- =====================================================

-- 1) Normaliza legado vencida -> vencido
UPDATE public.certificacoes
SET status = 'vencido'
WHERE status = 'vencida';

-- 2) Ajusta constraint de status
ALTER TABLE public.certificacoes
  DROP CONSTRAINT IF EXISTS certificacoes_status_check;

ALTER TABLE public.certificacoes
  ADD CONSTRAINT certificacoes_status_check
  CHECK (status IN ('vigente', 'vencido', 'suspensa', 'cancelada'));

-- 3) Função de sincronização por validade
CREATE OR REPLACE FUNCTION public.sync_certificacoes_status_by_validade()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_affected INTEGER := 0;
  v_now DATE := CURRENT_DATE;
BEGIN
  -- Vigente que venceu -> vencido
  UPDATE public.certificacoes
  SET status = 'vencido',
      updated_at = now()
  WHERE status = 'vigente'
    AND data_validade IS NOT NULL
    AND data_validade < v_now;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Vencido que voltou a ter validade futura/atual -> vigente
  UPDATE public.certificacoes
  SET status = 'vigente',
      updated_at = now()
  WHERE status = 'vencido'
    AND (
      data_validade IS NULL
      OR data_validade >= v_now
    );

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  v_count := v_count + v_affected;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_certificacoes_status_by_validade() TO authenticated;

-- 4) Trigger para sincronizar no ciclo de escrita
CREATE OR REPLACE FUNCTION public.ensure_certificacao_status_by_validade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('vigente', 'vencido') THEN
    IF NEW.data_validade IS NOT NULL AND NEW.data_validade < CURRENT_DATE THEN
      NEW.status := 'vencido';
    ELSIF NEW.status = 'vencido' AND (NEW.data_validade IS NULL OR NEW.data_validade >= CURRENT_DATE) THEN
      NEW.status := 'vigente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_certificacao_status_by_validade ON public.certificacoes;
CREATE TRIGGER trg_ensure_certificacao_status_by_validade
  BEFORE INSERT OR UPDATE ON public.certificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_certificacao_status_by_validade();

-- 5) Executa sincronização inicial
SELECT public.sync_certificacoes_status_by_validade();
