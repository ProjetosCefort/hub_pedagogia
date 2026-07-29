-- =====================================================
-- Conselho de Classe - novos campos em Registros da Reuniao
-- =====================================================

ALTER TABLE public.conselho_classe
  ADD COLUMN IF NOT EXISTS plano_acao_turma TEXT;

ALTER TABLE public.conselho_classe_registros
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS dificuldades TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS plano_acao TEXT;

-- Compatibilidade com dados antigos:
-- aproveita o campo legado "registro" como descricao quando vazio.
UPDATE public.conselho_classe_registros
SET descricao = COALESCE(NULLIF(descricao, ''), registro)
WHERE COALESCE(descricao, '') = ''
  AND COALESCE(registro, '') <> '';

COMMENT ON COLUMN public.conselho_classe.plano_acao_turma IS
  'Plano de acao para a classe/turma como um todo.';

COMMENT ON COLUMN public.conselho_classe_registros.descricao IS
  'Campo descritivo do registro da reuniao.';

COMMENT ON COLUMN public.conselho_classe_registros.dificuldades IS
  'Lista de dificuldades em formato de palavras-chave.';

COMMENT ON COLUMN public.conselho_classe_registros.plano_acao IS
  'Plano de acao individual para o registro.';
