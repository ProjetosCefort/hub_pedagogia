-- Mantem compatibilidade entre os grupos dinamicos e os modulos legados que
-- ainda consultam user_roles/has_role para liberar dados e acoes.
ALTER TABLE public.permission_groups
  ADD COLUMN IF NOT EXISTS legacy_role public.app_role;

UPDATE public.permission_groups
SET legacy_role = CASE
  WHEN lower(nome) = 'admin geral' THEN 'admin'::public.app_role
  WHEN lower(nome) IN ('gestao', 'gestão') THEN 'gestor'::public.app_role
  WHEN setor = 'pedagogico' THEN 'analista_pedagogico'::public.app_role
  WHEN setor = 'psicossocial' THEN 'analista_psicossocial'::public.app_role
  WHEN setor = 'servico_social' THEN 'analista_social'::public.app_role
  ELSE legacy_role
END
WHERE legacy_role IS NULL;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = _role
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_permission_groups upg
      JOIN public.permission_groups pg ON pg.id = upg.group_id
      WHERE upg.user_id = _user_id
        AND pg.ativo = TRUE
        AND pg.legacy_role = _role
    );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_permission_groups upg
      JOIN public.permission_groups pg ON pg.id = upg.group_id
      JOIN public.permission_group_items pgi ON pgi.group_id = pg.id
      JOIN public.permission_keys pk ON pk.id = pgi.permission_key_id
      WHERE upg.user_id = _user_id
        AND pg.ativo = TRUE
        AND pk.ativo = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.list_my_roles()
RETURNS TABLE(role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT effective_roles.role
  FROM (
    SELECT ur.role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()

    UNION ALL

    SELECT pg.legacy_role AS role
    FROM public.user_permission_groups upg
    JOIN public.permission_groups pg ON pg.id = upg.group_id
    WHERE upg.user_id = auth.uid()
      AND pg.ativo = TRUE
      AND pg.legacy_role IS NOT NULL
  ) effective_roles
  WHERE effective_roles.role IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_roles() TO authenticated;

DROP POLICY IF EXISTS "RBAC managers can view profiles" ON public.profiles;
CREATE POLICY "RBAC managers can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_permission('rbac.manage'));

COMMENT ON COLUMN public.permission_groups.legacy_role IS
  'Funcao legada efetiva fornecida pelo grupo para compatibilidade com modulos e politicas anteriores ao RBAC dinamico.';

