-- Adicionar status 'rejected' para inscrições rejeitadas na análise
ALTER TABLE public.inscricoes_jovens_aprendizes 
DROP CONSTRAINT IF EXISTS inscricoes_jovens_aprendizes_status_check;

ALTER TABLE public.inscricoes_jovens_aprendizes 
ADD CONSTRAINT inscricoes_jovens_aprendizes_status_check 
CHECK (status IN ('draft', 'completed', 'talent_bank', 'under_analysis', 'approved', 'active_apprentice', 'rejected'));

-- Índice para buscar rejeitados
CREATE INDEX IF NOT EXISTS idx_inscricoes_rejected ON public.inscricoes_jovens_aprendizes(status) WHERE status = 'rejected';
