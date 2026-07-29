-- Restrict RLS policies on configuration tables
-- Ensures only staff with explicit roles can read/write config data

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can read config_motivos_intervencao" ON public.config_motivos_intervencao;
    DROP POLICY IF EXISTS "Authenticated users can insert config_motivos_intervencao" ON public.config_motivos_intervencao;
    DROP POLICY IF EXISTS "Authenticated users can update config_motivos_intervencao" ON public.config_motivos_intervencao;

    DROP POLICY IF EXISTS "Authenticated users can read config_aproveitamento_escolar" ON public.config_aproveitamento_escolar;
    DROP POLICY IF EXISTS "Authenticated users can insert config_aproveitamento_escolar" ON public.config_aproveitamento_escolar;
    DROP POLICY IF EXISTS "Authenticated users can update config_aproveitamento_escolar" ON public.config_aproveitamento_escolar;

    DROP POLICY IF EXISTS "Authenticated users can read config_registros_sociais" ON public.config_registros_sociais;
    DROP POLICY IF EXISTS "Authenticated users can insert config_registros_sociais" ON public.config_registros_sociais;
    DROP POLICY IF EXISTS "Authenticated users can update config_registros_sociais" ON public.config_registros_sociais;

    DROP POLICY IF EXISTS "Authenticated users can read config_modelos_encaminhamento" ON public.config_modelos_encaminhamento;
    DROP POLICY IF EXISTS "Authenticated users can insert config_modelos_encaminhamento" ON public.config_modelos_encaminhamento;
    DROP POLICY IF EXISTS "Authenticated users can update config_modelos_encaminhamento" ON public.config_modelos_encaminhamento;

    DROP POLICY IF EXISTS "Authenticated users can read config_parametros" ON public.config_parametros;
    DROP POLICY IF EXISTS "Authenticated users can insert config_parametros" ON public.config_parametros;
    DROP POLICY IF EXISTS "Authenticated users can update config_parametros" ON public.config_parametros;
END
$$;

-- Convenience expression for admin or gestor checks
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'gestor');
$$;

-- Config Motivos de IntervenÃƒÂ§ÃƒÂ£o
CREATE POLICY "Staff can read config_motivos_intervencao"
ON public.config_motivos_intervencao
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admin/Gestor manage config_motivos_intervencao"
ON public.config_motivos_intervencao
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor update config_motivos_intervencao"
ON public.config_motivos_intervencao
FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()))
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor delete config_motivos_intervencao"
ON public.config_motivos_intervencao
FOR DELETE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));

-- Config Aproveitamento Escolar
CREATE POLICY "Staff can read config_aproveitamento_escolar"
ON public.config_aproveitamento_escolar
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admin/Gestor manage config_aproveitamento_escolar"
ON public.config_aproveitamento_escolar
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor update config_aproveitamento_escolar"
ON public.config_aproveitamento_escolar
FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()))
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor delete config_aproveitamento_escolar"
ON public.config_aproveitamento_escolar
FOR DELETE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));

-- Config Registros Sociais
CREATE POLICY "Staff can read config_registros_sociais"
ON public.config_registros_sociais
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admin/Gestor manage config_registros_sociais"
ON public.config_registros_sociais
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor update config_registros_sociais"
ON public.config_registros_sociais
FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()))
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor delete config_registros_sociais"
ON public.config_registros_sociais
FOR DELETE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));

-- Config Modelos de Encaminhamento
CREATE POLICY "Staff can read config_modelos_encaminhamento"
ON public.config_modelos_encaminhamento
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admin/Gestor manage config_modelos_encaminhamento"
ON public.config_modelos_encaminhamento
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor update config_modelos_encaminhamento"
ON public.config_modelos_encaminhamento
FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()))
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor delete config_modelos_encaminhamento"
ON public.config_modelos_encaminhamento
FOR DELETE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));

-- Config ParÃƒÂ¢metros
CREATE POLICY "Staff can read config_parametros"
ON public.config_parametros
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admin/Gestor manage config_parametros"
ON public.config_parametros
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor update config_parametros"
ON public.config_parametros
FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()))
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin/Gestor delete config_parametros"
ON public.config_parametros
FOR DELETE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));
