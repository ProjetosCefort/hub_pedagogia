-- Ajustes de Banco de Talentos, Planejamento Pedagógico e GOV.

-- Comentários imutáveis em inscrições do Banco de Talentos.
CREATE TABLE IF NOT EXISTS public.inscricao_notas_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_jovens_aprendizes(id) ON DELETE CASCADE,
  jovem_id UUID REFERENCES public.jovens(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inscricao_notas_inscricao_id
  ON public.inscricao_notas_internas(inscricao_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inscricao_notas_jovem_id
  ON public.inscricao_notas_internas(jovem_id, created_at DESC)
  WHERE jovem_id IS NOT NULL;

ALTER TABLE public.inscricao_notas_internas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view inscricao notas" ON public.inscricao_notas_internas;
CREATE POLICY "Staff can view inscricao notas"
  ON public.inscricao_notas_internas
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert inscricao notas" ON public.inscricao_notas_internas;
CREATE POLICY "Staff can insert inscricao notas"
  ON public.inscricao_notas_internas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid())
  );

GRANT SELECT, INSERT ON public.inscricao_notas_internas TO authenticated;

INSERT INTO public.inscricao_notas_internas (
  inscricao_id,
  jovem_id,
  note,
  created_by,
  created_at
)
SELECT
  i.id,
  i.jovem_id,
  i.notas_internas,
  NULL,
  COALESCE(i.updated_at, i.created_at, now())
FROM public.inscricoes_jovens_aprendizes i
WHERE i.notas_internas IS NOT NULL
  AND btrim(i.notas_internas) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.inscricao_notas_internas n
    WHERE n.inscricao_id = i.id
      AND n.note = i.notas_internas
  );

-- CBOs em ementas.
ALTER TABLE public.ementas
  ADD COLUMN IF NOT EXISTS cbo_tipo TEXT NOT NULL DEFAULT 'ocupacao',
  ADD COLUMN IF NOT EXISTS cbos TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

ALTER TABLE public.ementas
  DROP CONSTRAINT IF EXISTS ementas_cbo_tipo_check;

ALTER TABLE public.ementas
  ADD CONSTRAINT ementas_cbo_tipo_check
  CHECK (
    cbo_tipo = ANY (
      ARRAY['ocupacao', 'arco_ocupacional', 'multiplas_ocupacoes']
    )
  );

COMMENT ON COLUMN public.ementas.cbo_tipo IS
  'Tipo de vínculo ocupacional: ocupacao, arco_ocupacional ou multiplas_ocupacoes.';

COMMENT ON COLUMN public.ementas.cbos IS
  'Lista de CBOs relacionados à ementa.';

-- Cadastro GOV e vínculo com cursos.
CREATE TABLE IF NOT EXISTS public.gov_validacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  protocolo TEXT NOT NULL,
  numero_curso_mte TEXT,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  ementa_id UUID NOT NULL REFERENCES public.ementas(id) ON DELETE RESTRICT,
  alerta_antecedencia_dias INTEGER NOT NULL DEFAULT 90 CHECK (alerta_antecedencia_dias >= 0),
  vigencia_atual DATE,
  vigencia_final DATE,
  status TEXT NOT NULL DEFAULT 'cadastrado' CHECK (
    status = ANY (ARRAY['cadastrado', 'ajuste', 'aprovado', 'inativo'])
  ),
  ultimo_alerta_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT gov_validacoes_aprovado_required_check CHECK (
    status <> 'aprovado'
    OR (
      numero_curso_mte IS NOT NULL
      AND btrim(numero_curso_mte) <> ''
      AND vigencia_atual IS NOT NULL
      AND vigencia_final IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_gov_validacoes_status
  ON public.gov_validacoes(status);

CREATE INDEX IF NOT EXISTS idx_gov_validacoes_unidade_id
  ON public.gov_validacoes(unidade_id);

CREATE INDEX IF NOT EXISTS idx_gov_validacoes_ementa_id
  ON public.gov_validacoes(ementa_id);

DROP TRIGGER IF EXISTS update_gov_validacoes_updated_at ON public.gov_validacoes;
CREATE TRIGGER update_gov_validacoes_updated_at
  BEFORE UPDATE ON public.gov_validacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.gov_validacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with role can view gov_validacoes" ON public.gov_validacoes;
CREATE POLICY "Users with role can view gov_validacoes"
  ON public.gov_validacoes
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage gov_validacoes" ON public.gov_validacoes;
CREATE POLICY "Admins can manage gov_validacoes"
  ON public.gov_validacoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_validacoes TO authenticated;

ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS gov_validacao_id UUID REFERENCES public.gov_validacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cursos_gov_validacao_id
  ON public.cursos(gov_validacao_id)
  WHERE gov_validacao_id IS NOT NULL;

-- Permitir notificações do GOV e corrigir o erro de curso_gov_validacao.
ALTER TABLE public.notificacoes_internas
  DROP CONSTRAINT IF EXISTS notificacoes_internas_related_entity_type_check;

ALTER TABLE public.notificacoes_internas
  ADD CONSTRAINT notificacoes_internas_related_entity_type_check
  CHECK (
    related_entity_type IS NULL
    OR related_entity_type = ANY (
      ARRAY[
        'intervencao',
        'avaliacao',
        'documento',
        'status_change',
        'tarefa',
        'encaminhamento',
        'pendencia',
        'internal_note',
        'conselho_classe',
        'certificacoes',
        'solicitacao_setorial',
        'curso_gov_validacao',
        'gov_validacao'
      ]
    )
  );

CREATE OR REPLACE FUNCTION public.notify_gov_validacao_window()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_limite DATE;
  v_mensagem TEXT;
BEGIN
  IF NEW.status <> 'aprovado' OR NEW.vigencia_final IS NULL THEN
    RETURN NEW;
  END IF;

  v_limite := NEW.vigencia_final - COALESCE(NEW.alerta_antecedencia_dias, 90);

  IF CURRENT_DATE >= v_limite
     AND (NEW.ultimo_alerta_em IS NULL OR NEW.ultimo_alerta_em::date < CURRENT_DATE) THEN
    v_mensagem := format(
      'Validação GOV "%s" próxima do vencimento em %s. Protocolo: %s.',
      NEW.nome,
      to_char(NEW.vigencia_final, 'DD/MM/YYYY'),
      NEW.protocolo
    );

    INSERT INTO public.notificacoes_internas (
      related_entity_type,
      related_entity_id,
      mensagem,
      destinatario_role,
      created_by
    )
    VALUES (
      'gov_validacao',
      NEW.id,
      v_mensagem,
      'gestor',
      NEW.created_by
    );

    NEW.ultimo_alerta_em := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_gov_validacao_window ON public.gov_validacoes;
CREATE TRIGGER trg_notify_gov_validacao_window
  BEFORE INSERT OR UPDATE ON public.gov_validacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_gov_validacao_window();
