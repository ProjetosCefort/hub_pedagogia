-- =====================================================
-- Certificacoes: orgao emissor obrigatorio + antecedencia de notificacao
-- =====================================================

ALTER TABLE public.certificacoes
  ADD COLUMN IF NOT EXISTS notificar_antes_dias INTEGER NOT NULL DEFAULT 30
    CHECK (notificar_antes_dias >= 0),
  ADD COLUMN IF NOT EXISTS lembrete_validade_enviado_em TIMESTAMPTZ;

UPDATE public.certificacoes
SET tipo = COALESCE(NULLIF(tipo, ''), 'certificacao')
WHERE tipo IS NULL OR tipo = '';

ALTER TABLE public.certificacoes
  ALTER COLUMN tipo SET DEFAULT 'certificacao';

UPDATE public.certificacoes
SET orgao_emissor = COALESCE(NULLIF(orgao_emissor, ''), 'A definir')
WHERE orgao_emissor IS NULL OR orgao_emissor = '';

ALTER TABLE public.certificacoes
  ALTER COLUMN orgao_emissor SET NOT NULL;

COMMENT ON COLUMN public.certificacoes.notificar_antes_dias IS
  'Quantidade de dias antes da validade para notificar o setor responsavel.';

COMMENT ON COLUMN public.certificacoes.lembrete_validade_enviado_em IS
  'Data/hora do ultimo lembrete de validade enviado.';

CREATE OR REPLACE FUNCTION public.notify_certificacao_validade_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limite DATE;
  v_msg TEXT;
BEGIN
  IF NEW.status <> 'vigente' OR NEW.data_validade IS NULL THEN
    NEW.lembrete_validade_enviado_em := NULL;
    RETURN NEW;
  END IF;

  v_limite := NEW.data_validade - COALESCE(NEW.notificar_antes_dias, 0);

  IF CURRENT_DATE >= v_limite
     AND (NEW.lembrete_validade_enviado_em IS NULL OR NEW.lembrete_validade_enviado_em::date < CURRENT_DATE) THEN
    v_msg := format(
      'Certificação "%s" próxima do vencimento (%s). Verificar renovação.',
      NEW.titulo,
      to_char(NEW.data_validade, 'DD/MM/YYYY')
    );
    PERFORM public.create_internal_notification('gestor', v_msg, NULL, 'certificacoes', NEW.id);
    NEW.lembrete_validade_enviado_em := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_certificacao_validade_window ON public.certificacoes;
CREATE TRIGGER trg_notify_certificacao_validade_window
  BEFORE INSERT OR UPDATE ON public.certificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_certificacao_validade_window();
