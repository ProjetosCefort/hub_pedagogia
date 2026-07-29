-- Garante que a função get_pendencias_por_jovens existe (batch de pendências para lista de jovens).
-- Depende de get_jovem_pendencias (criada em 20260213000010 ou 20260226002000 / 20260227100000).

CREATE OR REPLACE FUNCTION public.get_pendencias_por_jovens(p_jovem_ids UUID[])
RETURNS TABLE (jovem_id UUID, pendencias TEXT[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF p_jovem_ids IS NULL OR array_length(p_jovem_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT j.id AS jovem_id, public.get_jovem_pendencias(j.id) AS pendencias
  FROM public.jovens j
  WHERE j.id = ANY(p_jovem_ids);
END;
$fn$;

COMMENT ON FUNCTION public.get_pendencias_por_jovens(UUID[]) IS
  'Retorna pendências em batch para múltiplos jovens. Usado na listagem.';

GRANT EXECUTE ON FUNCTION public.get_pendencias_por_jovens(UUID[]) TO authenticated;
