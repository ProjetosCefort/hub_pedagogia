ALTER TABLE public.jovens
  ADD COLUMN IF NOT EXISTS raca TEXT;

UPDATE public.jovens j
SET raca = i.raca
FROM public.inscricoes_jovens_aprendizes i
WHERE i.jovem_id = j.id
  AND COALESCE(j.raca, '') = ''
  AND COALESCE(i.raca, '') <> '';

CREATE TABLE IF NOT EXISTS public.frequencia_jovem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  data_registro DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('presenca', 'falta', 'falta_justificada', 'atraso')),
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'importacao')),
  observacoes TEXT,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT frequencia_jovem_unique UNIQUE (jovem_id, data_registro)
);

CREATE INDEX IF NOT EXISTS idx_frequencia_jovem_jovem_data
  ON public.frequencia_jovem(jovem_id, data_registro DESC);

ALTER TABLE public.frequencia_jovem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read frequencia jovem"
  ON public.frequencia_jovem
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert frequencia jovem"
  ON public.frequencia_jovem
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update frequencia jovem"
  ON public.frequencia_jovem
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete frequencia jovem"
  ON public.frequencia_jovem
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.set_updated_at_frequencia_jovem()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_frequencia_jovem ON public.frequencia_jovem;
CREATE TRIGGER trg_set_updated_at_frequencia_jovem
BEFORE UPDATE ON public.frequencia_jovem
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_frequencia_jovem();
