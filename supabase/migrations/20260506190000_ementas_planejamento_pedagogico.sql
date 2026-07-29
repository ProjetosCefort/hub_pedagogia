CREATE TABLE IF NOT EXISTS public.ementas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT,
  carga_horaria_teorica INTEGER NOT NULL DEFAULT 0 CHECK (carga_horaria_teorica >= 0),
  carga_horaria_pratica INTEGER NOT NULL DEFAULT 0 CHECK (carga_horaria_pratica >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.ementa_disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ementa_id UUID NOT NULL REFERENCES public.ementas(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ementa_id, disciplina_id)
);

CREATE INDEX IF NOT EXISTS idx_ementa_disciplinas_ementa_id
  ON public.ementa_disciplinas(ementa_id);

DROP TRIGGER IF EXISTS update_ementas_updated_at ON public.ementas;
CREATE TRIGGER update_ementas_updated_at
  BEFORE UPDATE ON public.ementas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_ementa_carga_teorica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ementa_id UUID;
BEGIN
  v_ementa_id := COALESCE(NEW.ementa_id, OLD.ementa_id);

  UPDATE public.ementas
     SET carga_horaria_teorica = COALESCE((
       SELECT SUM(d.carga_horaria)
       FROM public.ementa_disciplinas ed
       JOIN public.disciplinas d ON d.id = ed.disciplina_id
       WHERE ed.ementa_id = v_ementa_id
     ), 0)
   WHERE id = v_ementa_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ementa_carga_teorica_ins ON public.ementa_disciplinas;
CREATE TRIGGER trg_sync_ementa_carga_teorica_ins
  AFTER INSERT ON public.ementa_disciplinas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ementa_carga_teorica();

DROP TRIGGER IF EXISTS trg_sync_ementa_carga_teorica_upd ON public.ementa_disciplinas;
CREATE TRIGGER trg_sync_ementa_carga_teorica_upd
  AFTER UPDATE ON public.ementa_disciplinas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ementa_carga_teorica();

DROP TRIGGER IF EXISTS trg_sync_ementa_carga_teorica_del ON public.ementa_disciplinas;
CREATE TRIGGER trg_sync_ementa_carga_teorica_del
  AFTER DELETE ON public.ementa_disciplinas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ementa_carga_teorica();

ALTER TABLE public.ementas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ementa_disciplinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with role can view ementas" ON public.ementas;
CREATE POLICY "Users with role can view ementas"
  ON public.ementas
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage ementas" ON public.ementas;
CREATE POLICY "Admins can manage ementas"
  ON public.ementas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users with role can view ementa_disciplinas" ON public.ementa_disciplinas;
CREATE POLICY "Users with role can view ementa_disciplinas"
  ON public.ementa_disciplinas
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage ementa_disciplinas" ON public.ementa_disciplinas;
CREATE POLICY "Admins can manage ementa_disciplinas"
  ON public.ementa_disciplinas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
