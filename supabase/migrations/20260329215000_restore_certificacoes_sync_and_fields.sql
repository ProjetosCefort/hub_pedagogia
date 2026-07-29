-- Restaura recursos de certificações removidos no schema remoto:
-- - colunas notificar_antes_dias / lembrete_validade_enviado_em
-- - status "vencido" e função RPC de sincronização

ALTER TABLE public.certificacoes
  ADD COLUMN IF NOT EXISTS notificar_antes_dias INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS lembrete_validade_enviado_em TIMESTAMPTZ;

ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_related_entity_type_check;

ALTER TABLE public.notificacoes_internas
  ADD CONSTRAINT notificacoes_internas_related_entity_type_check
  CHECK (
    related_entity_type IS NULL
    OR related_entity_type = ANY (ARRAY[
      'intervencao',
      'avaliacao',
      'documento',
      'status_change',
      'tarefa',
      'encaminhamento',
      'pendencia',
      'certificacoes'
    ])
  );

UPDATE public.certificacoes
SET orgao_emissor = COALESCE(NULLIF(orgao_emissor, ''), 'A definir')
WHERE orgao_emissor IS NULL OR orgao_emissor = '';

ALTER TABLE public.certificacoes
  ALTER COLUMN orgao_emissor SET NOT NULL;

UPDATE public.certificacoes
SET status = 'vencido'
WHERE status = 'vencida';

ALTER TABLE public.certificacoes
  DROP CONSTRAINT IF EXISTS certificacoes_status_check;

ALTER TABLE public.certificacoes
  ADD CONSTRAINT certificacoes_status_check
  CHECK (status IN ('vigente', 'vencido', 'suspensa', 'cancelada'));

ALTER TABLE public.certificacoes
  DROP CONSTRAINT IF EXISTS certificacoes_notificar_antes_dias_check;

ALTER TABLE public.certificacoes
  ADD CONSTRAINT certificacoes_notificar_antes_dias_check
  CHECK (notificar_antes_dias >= 0);

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
  UPDATE public.certificacoes
  SET status = 'vencido',
      updated_at = now()
  WHERE status = 'vigente'
    AND data_validade IS NOT NULL
    AND data_validade < v_now;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.certificacoes
  SET status = 'vigente',
      updated_at = now()
  WHERE status = 'vencido'
    AND (data_validade IS NULL OR data_validade >= v_now);

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  v_count := v_count + v_affected;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_certificacoes_status_by_validade() TO authenticated;

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
    ELSIF NEW.status = 'vencido'
      AND (NEW.data_validade IS NULL OR NEW.data_validade >= CURRENT_DATE) THEN
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

SELECT public.sync_certificacoes_status_by_validade();
