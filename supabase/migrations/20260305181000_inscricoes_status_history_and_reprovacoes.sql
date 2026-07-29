-- P0.1 - Histórico de status e reprovações de inscrições

CREATE TABLE IF NOT EXISTS public.inscricoes_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_jovens_aprendizes(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  motivo TEXT,
  observacao TEXT,
  origem TEXT NOT NULL DEFAULT 'manual',
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_status_history_inscricao_created_at
  ON public.inscricoes_status_history(inscricao_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inscricoes_status_history_new_status
  ON public.inscricoes_status_history(new_status);

CREATE TABLE IF NOT EXISTS public.inscricoes_reprovacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_jovens_aprendizes(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  motivo TEXT NOT NULL,
  observacao TEXT,
  origem TEXT NOT NULL DEFAULT 'analise',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retornada_ao_banco_em TIMESTAMPTZ,
  retornada_por UUID REFERENCES auth.users(id),
  retorno_observacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_reprovacoes_inscricao_created_at
  ON public.inscricoes_reprovacoes(inscricao_id, created_at DESC);

ALTER TABLE public.inscricoes_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes_reprovacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with role can read inscricoes status history" ON public.inscricoes_status_history;
CREATE POLICY "Users with role can read inscricoes status history"
  ON public.inscricoes_status_history
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users with role can read inscricoes reprovacoes" ON public.inscricoes_reprovacoes;
CREATE POLICY "Users with role can read inscricoes reprovacoes"
  ON public.inscricoes_reprovacoes
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

GRANT SELECT ON public.inscricoes_status_history TO authenticated;
GRANT SELECT ON public.inscricoes_reprovacoes TO authenticated;
