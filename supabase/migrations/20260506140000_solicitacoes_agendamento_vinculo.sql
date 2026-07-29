ALTER TABLE public.solicitacoes_setoriais
  ADD COLUMN IF NOT EXISTS atendimento_agendado_id UUID
    REFERENCES public.atendimentos_agendados(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agendamento_criado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_setoriais_atendimento
  ON public.solicitacoes_setoriais(atendimento_agendado_id);

COMMENT ON COLUMN public.solicitacoes_setoriais.atendimento_agendado_id IS
  'Atendimento agendado gerado a partir da solicitacao setorial.';

COMMENT ON COLUMN public.solicitacoes_setoriais.agendamento_criado_em IS
  'Data e hora em que o agendamento vinculado foi criado.';
