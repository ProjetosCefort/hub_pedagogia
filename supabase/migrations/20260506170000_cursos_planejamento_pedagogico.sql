CREATE TABLE IF NOT EXISTS public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  ementa_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cursos_unidade_id
  ON public.cursos(unidade_id)
  WHERE unidade_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_cursos_updated_at ON public.cursos;
CREATE TRIGGER update_cursos_updated_at
  BEFORE UPDATE ON public.cursos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with role can view cursos" ON public.cursos;
CREATE POLICY "Users with role can view cursos"
  ON public.cursos
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage cursos" ON public.cursos;
CREATE POLICY "Admins can manage cursos"
  ON public.cursos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS curso_id UUID REFERENCES public.cursos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_turmas_curso_id
  ON public.turmas(curso_id)
  WHERE curso_id IS NOT NULL;
