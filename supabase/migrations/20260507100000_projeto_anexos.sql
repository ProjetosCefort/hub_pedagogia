CREATE TABLE IF NOT EXISTS public.projeto_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto_projeto', 'foto', 'anexo')),
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projeto_anexos_projeto_id
  ON public.projeto_anexos(projeto_id);

ALTER TABLE public.projeto_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view projeto_anexos"
  ON public.projeto_anexos
  FOR SELECT
  TO authenticated
  USING (public.has_permission('projetos.read'));

CREATE POLICY "Permission can insert projeto_anexos"
  ON public.projeto_anexos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('projetos.write'));

CREATE POLICY "Permission can update projeto_anexos"
  ON public.projeto_anexos
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('projetos.write'))
  WITH CHECK (public.has_permission('projetos.write'));

CREATE POLICY "Permission can delete projeto_anexos"
  ON public.projeto_anexos
  FOR DELETE
  TO authenticated
  USING (public.has_permission('projetos.write'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_anexos TO authenticated;

COMMENT ON TABLE public.projeto_anexos IS
  'Arquivos vinculados aos projetos, incluindo texto do projeto, fotos e anexos gerais.';
