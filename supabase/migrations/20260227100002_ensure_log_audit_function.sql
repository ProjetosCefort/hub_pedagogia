-- Garante que a função log_audit existe (caso 20260213000011 não tenha sido aplicada ou tenha falhado).

DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.audit_action_type AS ENUM ('create', 'update', 'delete', 'status_change');
  END IF;
END;
$mig$;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_type public.audit_action_type NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  diff_json JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON public.audit_logs(changed_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action_type public.audit_action_type,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_current_user_id UUID;
  v_log_id UUID;
  v_diff_json JSONB;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    v_current_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  IF p_old_data IS NOT NULL AND p_new_data IS NOT NULL THEN
    v_diff_json := jsonb_build_object('old', p_old_data, 'new', p_new_data);
  ELSIF p_new_data IS NOT NULL THEN
    v_diff_json := jsonb_build_object('new', p_new_data);
  ELSIF p_old_data IS NOT NULL THEN
    v_diff_json := jsonb_build_object('old', p_old_data);
  END IF;

  INSERT INTO public.audit_logs (
    entity_type, entity_id, action_type, changed_by, changed_at, diff_json, metadata
  ) VALUES (
    p_entity_type, p_entity_id, p_action_type, v_current_user_id, now(), v_diff_json, p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, UUID, public.audit_action_type, JSONB, JSONB, JSONB) TO authenticated;
