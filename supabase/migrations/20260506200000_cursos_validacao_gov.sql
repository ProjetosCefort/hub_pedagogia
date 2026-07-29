ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS gov_protocolo TEXT,
  ADD COLUMN IF NOT EXISTS gov_vigencia_inicio DATE,
  ADD COLUMN IF NOT EXISTS gov_vigencia_fim DATE,
  ADD COLUMN IF NOT EXISTS gov_notificar_antes_dias INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS gov_repetir_notificacao_quinzenal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gov_ultimo_lembrete_em TIMESTAMPTZ;

COMMENT ON COLUMN public.cursos.gov_protocolo IS
  'Número de protocolo da validação governamental do curso.';

COMMENT ON COLUMN public.cursos.gov_vigencia_inicio IS
  'Data inicial de vigência da validação GOV.';

COMMENT ON COLUMN public.cursos.gov_vigencia_fim IS
  'Data final de vigência da validação GOV.';

COMMENT ON COLUMN public.cursos.gov_notificar_antes_dias IS
  'Quantidade de dias de antecedência para alertar sobre o vencimento da validação GOV.';

COMMENT ON COLUMN public.cursos.gov_repetir_notificacao_quinzenal IS
  'Se ativo, repete lembretes da validação GOV a cada 14 dias enquanto estiver na janela de alerta.';

COMMENT ON COLUMN public.cursos.gov_ultimo_lembrete_em IS
  'Data/hora do último lembrete interno emitido para a validação GOV.';

CREATE OR REPLACE FUNCTION public.notify_curso_gov_validade_window()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_limite DATE;
  v_mensagem TEXT;
  v_deve_notificar BOOLEAN := false;
BEGIN
  IF NEW.gov_vigencia_fim IS NULL THEN
    NEW.gov_ultimo_lembrete_em := NULL;
    RETURN NEW;
  END IF;

  v_limite := NEW.gov_vigencia_fim - COALESCE(NEW.gov_notificar_antes_dias, 90);

  IF CURRENT_DATE >= v_limite THEN
    IF NEW.gov_repetir_notificacao_quinzenal THEN
      v_deve_notificar :=
        NEW.gov_ultimo_lembrete_em IS NULL
        OR NEW.gov_ultimo_lembrete_em <= now() - interval '14 days';
    ELSE
      v_deve_notificar :=
        NEW.gov_ultimo_lembrete_em IS NULL
        OR NEW.gov_ultimo_lembrete_em::date < CURRENT_DATE;
    END IF;
  END IF;

  IF v_deve_notificar THEN
    v_mensagem := format(
      'Curso "%s" com validação GOV próxima do vencimento em %s. Verificar renovação do protocolo %s.',
      NEW.nome,
      to_char(NEW.gov_vigencia_fim, 'DD/MM/YYYY'),
      COALESCE(NEW.gov_protocolo, 'não informado')
    );

    INSERT INTO public.notificacoes_internas (
      related_entity_type,
      related_entity_id,
      mensagem,
      destinatario_role,
      created_by
    )
    VALUES (
      'curso_gov_validacao',
      NEW.id,
      v_mensagem,
      'gestor',
      NEW.created_by
    );

    NEW.gov_ultimo_lembrete_em := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_curso_gov_validade_window ON public.cursos;
CREATE TRIGGER trg_notify_curso_gov_validade_window
  BEFORE INSERT OR UPDATE ON public.cursos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_curso_gov_validade_window();
