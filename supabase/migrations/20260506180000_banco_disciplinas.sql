CREATE TABLE IF NOT EXISTS public.disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  tipo_modulo TEXT NOT NULL,
  carga_horaria INTEGER NOT NULL CHECK (carga_horaria >= 0),
  numero_encontros INTEGER NOT NULL CHECK (numero_encontros >= 0),
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_disciplinas_tipo_modulo
  ON public.disciplinas(tipo_modulo);

DROP TRIGGER IF EXISTS update_disciplinas_updated_at ON public.disciplinas;
CREATE TRIGGER update_disciplinas_updated_at
  BEFORE UPDATE ON public.disciplinas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with role can view disciplinas" ON public.disciplinas;
CREATE POLICY "Users with role can view disciplinas"
  ON public.disciplinas
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage disciplinas" ON public.disciplinas;
CREATE POLICY "Admins can manage disciplinas"
  ON public.disciplinas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
