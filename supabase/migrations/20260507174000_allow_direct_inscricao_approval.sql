-- Alinha a máquina de status com o fluxo real da gestão:
-- inscrições em pré-análise também podem ser aprovadas ou reprovadas.

CREATE OR REPLACE FUNCTION public.validate_inscricao_status_transition(
  p_current_status TEXT,
  p_new_status TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_current_status IS NULL OR p_new_status IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_current_status = p_new_status THEN
    RETURN TRUE;
  END IF;

  CASE p_current_status
    WHEN 'draft', 'completed', 'talent_bank' THEN
      RETURN p_new_status IN (
        'draft',
        'completed',
        'talent_bank',
        'under_analysis',
        'approved',
        'rejected'
      );
    WHEN 'under_analysis' THEN
      RETURN p_new_status IN ('draft', 'completed', 'talent_bank', 'approved', 'rejected');
    WHEN 'rejected' THEN
      RETURN p_new_status IN ('talent_bank');
    WHEN 'approved' THEN
      RETURN p_new_status IN ('active_apprentice');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;
