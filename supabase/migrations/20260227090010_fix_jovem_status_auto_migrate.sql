-- Part 1: Add new enum values only. New values must be committed before use (next migration).

CREATE OR REPLACE FUNCTION public._mig_fix_jovem_status_enum()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_status text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'jovem_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.jovem_status AS ENUM (
      'draft',
      'completed',
      'under_analysis',
      'pending_documents',
      'approved',
      'rejected',
      'active_apprentice',
      'inactive',
      'terminated',
      'completed_program'
    );
  END IF;

  FOREACH v_status IN ARRAY ARRAY[
    'draft', 'completed', 'under_analysis', 'pending_documents',
    'approved', 'rejected', 'active_apprentice', 'inactive',
    'terminated', 'completed_program'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.jovem_status ADD VALUE %L', v_status);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END;
$fn$;

SELECT public._mig_fix_jovem_status_enum();

DROP FUNCTION public._mig_fix_jovem_status_enum();
