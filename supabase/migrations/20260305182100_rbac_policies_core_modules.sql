-- P0.2 - Policies de módulos core usando has_permission

-- Intervenções
DROP POLICY IF EXISTS "Users with role can view intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Users with role can insert intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Users with role can update intervencoes" ON public.intervencoes;

CREATE POLICY "Permission can view intervencoes"
  ON public.intervencoes
  FOR SELECT
  TO authenticated
  USING (public.has_permission('intervencoes.read'));

CREATE POLICY "Permission can insert intervencoes"
  ON public.intervencoes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('intervencoes.write'));

CREATE POLICY "Permission can update intervencoes"
  ON public.intervencoes
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('intervencoes.write'))
  WITH CHECK (public.has_permission('intervencoes.write'));

CREATE POLICY "Permission can delete intervencoes"
  ON public.intervencoes
  FOR DELETE
  TO authenticated
  USING (public.has_permission('intervencoes.write'));

-- Avaliações Pedagógicas
DROP POLICY IF EXISTS "Users with role can view avaliacoes_pedagogicas" ON public.avaliacoes_pedagogicas;
DROP POLICY IF EXISTS "Users with role can insert avaliacoes_pedagogicas" ON public.avaliacoes_pedagogicas;
DROP POLICY IF EXISTS "Users with role can update avaliacoes_pedagogicas" ON public.avaliacoes_pedagogicas;

CREATE POLICY "Permission can view avaliacoes_pedagogicas"
  ON public.avaliacoes_pedagogicas
  FOR SELECT
  TO authenticated
  USING (public.has_permission('avaliacoes_pedagogicas.read'));

CREATE POLICY "Permission can insert avaliacoes_pedagogicas"
  ON public.avaliacoes_pedagogicas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('avaliacoes_pedagogicas.write'));

CREATE POLICY "Permission can update avaliacoes_pedagogicas"
  ON public.avaliacoes_pedagogicas
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('avaliacoes_pedagogicas.write'))
  WITH CHECK (public.has_permission('avaliacoes_pedagogicas.write'));

CREATE POLICY "Permission can delete avaliacoes_pedagogicas"
  ON public.avaliacoes_pedagogicas
  FOR DELETE
  TO authenticated
  USING (public.has_permission('avaliacoes_pedagogicas.write'));

-- Avaliações Socioeconômicas
DROP POLICY IF EXISTS "Users with role can view avaliacoes_socioeconomicas" ON public.avaliacoes_socioeconomicas;
DROP POLICY IF EXISTS "Users with role can insert avaliacoes_socioeconomicas" ON public.avaliacoes_socioeconomicas;
DROP POLICY IF EXISTS "Users with role can update avaliacoes_socioeconomicas" ON public.avaliacoes_socioeconomicas;

CREATE POLICY "Permission can view avaliacoes_socioeconomicas"
  ON public.avaliacoes_socioeconomicas
  FOR SELECT
  TO authenticated
  USING (public.has_permission('avaliacoes_socioeconomicas.read'));

CREATE POLICY "Permission can insert avaliacoes_socioeconomicas"
  ON public.avaliacoes_socioeconomicas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('avaliacoes_socioeconomicas.write'));

CREATE POLICY "Permission can update avaliacoes_socioeconomicas"
  ON public.avaliacoes_socioeconomicas
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('avaliacoes_socioeconomicas.write'))
  WITH CHECK (public.has_permission('avaliacoes_socioeconomicas.write'));

CREATE POLICY "Permission can delete avaliacoes_socioeconomicas"
  ON public.avaliacoes_socioeconomicas
  FOR DELETE
  TO authenticated
  USING (public.has_permission('avaliacoes_socioeconomicas.write'));

-- Encaminhamentos
DROP POLICY IF EXISTS "Users with role can view encaminhamentos" ON public.encaminhamentos;
DROP POLICY IF EXISTS "Users with role can insert encaminhamentos" ON public.encaminhamentos;
DROP POLICY IF EXISTS "Users with role can update encaminhamentos" ON public.encaminhamentos;
DROP POLICY IF EXISTS "Users with role can delete encaminhamentos" ON public.encaminhamentos;

CREATE POLICY "Permission can view encaminhamentos"
  ON public.encaminhamentos
  FOR SELECT
  TO authenticated
  USING (public.has_permission('encaminhamentos.read'));

CREATE POLICY "Permission can insert encaminhamentos"
  ON public.encaminhamentos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('encaminhamentos.write'));

CREATE POLICY "Permission can update encaminhamentos"
  ON public.encaminhamentos
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('encaminhamentos.write'))
  WITH CHECK (public.has_permission('encaminhamentos.write'));

CREATE POLICY "Permission can delete encaminhamentos"
  ON public.encaminhamentos
  FOR DELETE
  TO authenticated
  USING (public.has_permission('encaminhamentos.write'));

-- Agenda (atendimentos agendados)
DROP POLICY IF EXISTS "Staff pode visualizar atendimentos agendados" ON public.atendimentos_agendados;
DROP POLICY IF EXISTS "Staff pode inserir atendimentos agendados" ON public.atendimentos_agendados;
DROP POLICY IF EXISTS "Staff pode atualizar atendimentos agendados" ON public.atendimentos_agendados;
DROP POLICY IF EXISTS "Somente criador ou admin pode excluir atendimentos agendados" ON public.atendimentos_agendados;

CREATE POLICY "Permission can view atendimentos_agendados"
  ON public.atendimentos_agendados
  FOR SELECT
  TO authenticated
  USING (public.has_permission('agenda.read'));

CREATE POLICY "Permission can insert atendimentos_agendados"
  ON public.atendimentos_agendados
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('agenda.write'));

CREATE POLICY "Permission can update atendimentos_agendados"
  ON public.atendimentos_agendados
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('agenda.write'))
  WITH CHECK (public.has_permission('agenda.write'));

CREATE POLICY "Permission can delete atendimentos_agendados"
  ON public.atendimentos_agendados
  FOR DELETE
  TO authenticated
  USING (public.has_permission('agenda.write'));

-- Configurações base
DROP POLICY IF EXISTS "Staff can read config_motivos_intervencao" ON public.config_motivos_intervencao;
DROP POLICY IF EXISTS "Admin/Gestor manage config_motivos_intervencao" ON public.config_motivos_intervencao;
DROP POLICY IF EXISTS "Admin/Gestor update config_motivos_intervencao" ON public.config_motivos_intervencao;
DROP POLICY IF EXISTS "Admin/Gestor delete config_motivos_intervencao" ON public.config_motivos_intervencao;

DROP POLICY IF EXISTS "Staff can read config_aproveitamento_escolar" ON public.config_aproveitamento_escolar;
DROP POLICY IF EXISTS "Admin/Gestor manage config_aproveitamento_escolar" ON public.config_aproveitamento_escolar;
DROP POLICY IF EXISTS "Admin/Gestor update config_aproveitamento_escolar" ON public.config_aproveitamento_escolar;
DROP POLICY IF EXISTS "Admin/Gestor delete config_aproveitamento_escolar" ON public.config_aproveitamento_escolar;

DROP POLICY IF EXISTS "Staff can read config_registros_sociais" ON public.config_registros_sociais;
DROP POLICY IF EXISTS "Admin/Gestor manage config_registros_sociais" ON public.config_registros_sociais;
DROP POLICY IF EXISTS "Admin/Gestor update config_registros_sociais" ON public.config_registros_sociais;
DROP POLICY IF EXISTS "Admin/Gestor delete config_registros_sociais" ON public.config_registros_sociais;

DROP POLICY IF EXISTS "Staff can read config_modelos_encaminhamento" ON public.config_modelos_encaminhamento;
DROP POLICY IF EXISTS "Admin/Gestor manage config_modelos_encaminhamento" ON public.config_modelos_encaminhamento;
DROP POLICY IF EXISTS "Admin/Gestor update config_modelos_encaminhamento" ON public.config_modelos_encaminhamento;
DROP POLICY IF EXISTS "Admin/Gestor delete config_modelos_encaminhamento" ON public.config_modelos_encaminhamento;

DROP POLICY IF EXISTS "Staff can read config_parametros" ON public.config_parametros;
DROP POLICY IF EXISTS "Admin/Gestor manage config_parametros" ON public.config_parametros;
DROP POLICY IF EXISTS "Admin/Gestor update config_parametros" ON public.config_parametros;
DROP POLICY IF EXISTS "Admin/Gestor delete config_parametros" ON public.config_parametros;

CREATE POLICY "Permission can manage config_motivos_intervencao"
  ON public.config_motivos_intervencao
  FOR ALL
  TO authenticated
  USING (public.has_permission('configuracoes.write'))
  WITH CHECK (public.has_permission('configuracoes.write'));

CREATE POLICY "Permission can manage config_aproveitamento_escolar"
  ON public.config_aproveitamento_escolar
  FOR ALL
  TO authenticated
  USING (public.has_permission('configuracoes.write'))
  WITH CHECK (public.has_permission('configuracoes.write'));

CREATE POLICY "Permission can manage config_registros_sociais"
  ON public.config_registros_sociais
  FOR ALL
  TO authenticated
  USING (public.has_permission('configuracoes.write'))
  WITH CHECK (public.has_permission('configuracoes.write'));

CREATE POLICY "Permission can manage config_modelos_encaminhamento"
  ON public.config_modelos_encaminhamento
  FOR ALL
  TO authenticated
  USING (public.has_permission('configuracoes.write'))
  WITH CHECK (public.has_permission('configuracoes.write'));

CREATE POLICY "Permission can manage config_parametros"
  ON public.config_parametros
  FOR ALL
  TO authenticated
  USING (public.has_permission('configuracoes.write'))
  WITH CHECK (public.has_permission('configuracoes.write'));
