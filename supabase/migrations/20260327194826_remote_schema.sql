drop extension if exists "pg_net";

drop trigger if exists "trg_sync_motivo_intervencao_pedagogicas" on "public"."avaliacoes_pedagogicas";

drop trigger if exists "trg_validate_motivo_pedagogicas" on "public"."avaliacoes_pedagogicas";

drop trigger if exists "trg_validate_registro_social_active" on "public"."avaliacoes_socioeconomicas_registros_sociais";

drop trigger if exists "trg_ensure_certificacao_status_by_validade" on "public"."certificacoes";

drop trigger if exists "trg_notify_certificacao_validade_window" on "public"."certificacoes";

drop trigger if exists "update_config_modelos_documentos_updated_at" on "public"."config_modelos_documentos";

drop trigger if exists "tr_config_motivos_avaliacao_pedagogica_updated" on "public"."config_motivos_avaliacao_pedagogica";

drop trigger if exists "trg_validate_modelo_encaminhamento" on "public"."encaminhamentos";

drop trigger if exists "notify_internal_note_insert" on "public"."internal_notes";

drop trigger if exists "trg_sync_motivo_intervencao_intervencoes" on "public"."intervencoes";

drop trigger if exists "trg_validate_motivo_intervencoes" on "public"."intervencoes";

drop trigger if exists "notify_status_change_insert" on "public"."jovem_status_history";

drop trigger if exists "trigger_check_jovem_status_transition" on "public"."jovens";

drop policy "Permission can delete avaliacoes_pedagogicas_anexos" on "public"."avaliacoes_pedagogicas_anexos";

drop policy "Permission can insert avaliacoes_pedagogicas_anexos" on "public"."avaliacoes_pedagogicas_anexos";

drop policy "Permission can update avaliacoes_pedagogicas_anexos" on "public"."avaliacoes_pedagogicas_anexos";

drop policy "Permission can view avaliacoes_pedagogicas_anexos" on "public"."avaliacoes_pedagogicas_anexos";

drop policy "Users with role can delete avaliacoes_socio_registros" on "public"."avaliacoes_socioeconomicas_registros_sociais";

drop policy "Users with role can insert avaliacoes_socio_registros" on "public"."avaliacoes_socioeconomicas_registros_sociais";

drop policy "Users with role can view avaliacoes_socio_registros" on "public"."avaliacoes_socioeconomicas_registros_sociais";

drop policy "Authenticated users can insert config_modelos_documentos" on "public"."config_modelos_documentos";

drop policy "Authenticated users can read config_modelos_documentos" on "public"."config_modelos_documentos";

drop policy "Authenticated users can update config_modelos_documentos" on "public"."config_modelos_documentos";

drop policy "Authenticated users can insert config_motivos_avaliacao_pedagog" on "public"."config_motivos_avaliacao_pedagogica";

drop policy "Authenticated users can read config_motivos_avaliacao_pedagogic" on "public"."config_motivos_avaliacao_pedagogica";

drop policy "Authenticated users can update config_motivos_avaliacao_pedagog" on "public"."config_motivos_avaliacao_pedagogica";

drop policy "Staff can insert documentos_emitidos_jovem" on "public"."documentos_emitidos_jovem";

drop policy "Staff can view documentos_emitidos_jovem" on "public"."documentos_emitidos_jovem";

drop policy "Public token select documentos_jovem" on "public"."documentos_jovem";

drop policy "Public insert inscricoes" on "public"."inscricoes_jovens_aprendizes";

drop policy "Public token select inscricoes" on "public"."inscricoes_jovens_aprendizes";

drop policy "Public token update inscricoes" on "public"."inscricoes_jovens_aprendizes";

drop policy "Staff full access inscricoes" on "public"."inscricoes_jovens_aprendizes";

drop policy "Staff can delete internal notes" on "public"."internal_notes";

drop policy "Staff can insert internal notes" on "public"."internal_notes";

drop policy "Staff can update internal notes" on "public"."internal_notes";

drop policy "Staff can view internal notes" on "public"."internal_notes";

drop policy "Usuários autenticados podem inserir histórico de status" on "public"."jovem_status_history";

drop policy "Usuários autenticados podem ler histórico de status" on "public"."jovem_status_history";

drop policy "Public token select jovens" on "public"."jovens";

drop policy "Public token update jovens" on "public"."jovens";

drop policy "Staff full access jovens" on "public"."jovens";

drop policy "Staff atualizam notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes " on "public"."notificacoes_internas";

drop policy "Staff enxergam notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes p" on "public"."notificacoes_internas";

drop policy "Staff inserem notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes" on "public"."notificacoes_internas";

drop policy "UsuÃƒÂ¡rio pode atualizar notificaÃƒÂ§ÃƒÂµes do pr" on "public"."notificacoes_internas";

drop policy "UsuÃƒÂ¡rio pode ler notificaÃƒÂ§ÃƒÂµes do prÃƒÂ" on "public"."notificacoes_internas";

revoke delete on table "public"."avaliacoes_pedagogicas_anexos" from "anon";

revoke insert on table "public"."avaliacoes_pedagogicas_anexos" from "anon";

revoke references on table "public"."avaliacoes_pedagogicas_anexos" from "anon";

revoke select on table "public"."avaliacoes_pedagogicas_anexos" from "anon";

revoke trigger on table "public"."avaliacoes_pedagogicas_anexos" from "anon";

revoke truncate on table "public"."avaliacoes_pedagogicas_anexos" from "anon";

revoke update on table "public"."avaliacoes_pedagogicas_anexos" from "anon";

revoke delete on table "public"."avaliacoes_pedagogicas_anexos" from "authenticated";

revoke insert on table "public"."avaliacoes_pedagogicas_anexos" from "authenticated";

revoke references on table "public"."avaliacoes_pedagogicas_anexos" from "authenticated";

revoke select on table "public"."avaliacoes_pedagogicas_anexos" from "authenticated";

revoke trigger on table "public"."avaliacoes_pedagogicas_anexos" from "authenticated";

revoke truncate on table "public"."avaliacoes_pedagogicas_anexos" from "authenticated";

revoke update on table "public"."avaliacoes_pedagogicas_anexos" from "authenticated";

revoke delete on table "public"."avaliacoes_pedagogicas_anexos" from "service_role";

revoke insert on table "public"."avaliacoes_pedagogicas_anexos" from "service_role";

revoke references on table "public"."avaliacoes_pedagogicas_anexos" from "service_role";

revoke select on table "public"."avaliacoes_pedagogicas_anexos" from "service_role";

revoke trigger on table "public"."avaliacoes_pedagogicas_anexos" from "service_role";

revoke truncate on table "public"."avaliacoes_pedagogicas_anexos" from "service_role";

revoke update on table "public"."avaliacoes_pedagogicas_anexos" from "service_role";

revoke delete on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "anon";

revoke insert on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "anon";

revoke references on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "anon";

revoke select on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "anon";

revoke trigger on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "anon";

revoke truncate on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "anon";

revoke update on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "anon";

revoke delete on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "authenticated";

revoke insert on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "authenticated";

revoke references on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "authenticated";

revoke select on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "authenticated";

revoke trigger on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "authenticated";

revoke truncate on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "authenticated";

revoke update on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "authenticated";

revoke delete on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "service_role";

revoke insert on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "service_role";

revoke references on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "service_role";

revoke select on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "service_role";

revoke trigger on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "service_role";

revoke truncate on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "service_role";

revoke update on table "public"."avaliacoes_socioeconomicas_registros_sociais" from "service_role";

revoke delete on table "public"."config_modelos_documentos" from "anon";

revoke insert on table "public"."config_modelos_documentos" from "anon";

revoke references on table "public"."config_modelos_documentos" from "anon";

revoke select on table "public"."config_modelos_documentos" from "anon";

revoke trigger on table "public"."config_modelos_documentos" from "anon";

revoke truncate on table "public"."config_modelos_documentos" from "anon";

revoke update on table "public"."config_modelos_documentos" from "anon";

revoke delete on table "public"."config_modelos_documentos" from "authenticated";

revoke insert on table "public"."config_modelos_documentos" from "authenticated";

revoke references on table "public"."config_modelos_documentos" from "authenticated";

revoke select on table "public"."config_modelos_documentos" from "authenticated";

revoke trigger on table "public"."config_modelos_documentos" from "authenticated";

revoke truncate on table "public"."config_modelos_documentos" from "authenticated";

revoke update on table "public"."config_modelos_documentos" from "authenticated";

revoke delete on table "public"."config_modelos_documentos" from "service_role";

revoke insert on table "public"."config_modelos_documentos" from "service_role";

revoke references on table "public"."config_modelos_documentos" from "service_role";

revoke select on table "public"."config_modelos_documentos" from "service_role";

revoke trigger on table "public"."config_modelos_documentos" from "service_role";

revoke truncate on table "public"."config_modelos_documentos" from "service_role";

revoke update on table "public"."config_modelos_documentos" from "service_role";

revoke delete on table "public"."config_motivos_avaliacao_pedagogica" from "anon";

revoke insert on table "public"."config_motivos_avaliacao_pedagogica" from "anon";

revoke references on table "public"."config_motivos_avaliacao_pedagogica" from "anon";

revoke select on table "public"."config_motivos_avaliacao_pedagogica" from "anon";

revoke trigger on table "public"."config_motivos_avaliacao_pedagogica" from "anon";

revoke truncate on table "public"."config_motivos_avaliacao_pedagogica" from "anon";

revoke update on table "public"."config_motivos_avaliacao_pedagogica" from "anon";

revoke delete on table "public"."config_motivos_avaliacao_pedagogica" from "authenticated";

revoke insert on table "public"."config_motivos_avaliacao_pedagogica" from "authenticated";

revoke references on table "public"."config_motivos_avaliacao_pedagogica" from "authenticated";

revoke select on table "public"."config_motivos_avaliacao_pedagogica" from "authenticated";

revoke trigger on table "public"."config_motivos_avaliacao_pedagogica" from "authenticated";

revoke truncate on table "public"."config_motivos_avaliacao_pedagogica" from "authenticated";

revoke update on table "public"."config_motivos_avaliacao_pedagogica" from "authenticated";

revoke delete on table "public"."config_motivos_avaliacao_pedagogica" from "service_role";

revoke insert on table "public"."config_motivos_avaliacao_pedagogica" from "service_role";

revoke references on table "public"."config_motivos_avaliacao_pedagogica" from "service_role";

revoke select on table "public"."config_motivos_avaliacao_pedagogica" from "service_role";

revoke trigger on table "public"."config_motivos_avaliacao_pedagogica" from "service_role";

revoke truncate on table "public"."config_motivos_avaliacao_pedagogica" from "service_role";

revoke update on table "public"."config_motivos_avaliacao_pedagogica" from "service_role";

revoke delete on table "public"."documentos_emitidos_jovem" from "anon";

revoke insert on table "public"."documentos_emitidos_jovem" from "anon";

revoke references on table "public"."documentos_emitidos_jovem" from "anon";

revoke select on table "public"."documentos_emitidos_jovem" from "anon";

revoke trigger on table "public"."documentos_emitidos_jovem" from "anon";

revoke truncate on table "public"."documentos_emitidos_jovem" from "anon";

revoke update on table "public"."documentos_emitidos_jovem" from "anon";

revoke delete on table "public"."documentos_emitidos_jovem" from "authenticated";

revoke insert on table "public"."documentos_emitidos_jovem" from "authenticated";

revoke references on table "public"."documentos_emitidos_jovem" from "authenticated";

revoke select on table "public"."documentos_emitidos_jovem" from "authenticated";

revoke trigger on table "public"."documentos_emitidos_jovem" from "authenticated";

revoke truncate on table "public"."documentos_emitidos_jovem" from "authenticated";

revoke update on table "public"."documentos_emitidos_jovem" from "authenticated";

revoke delete on table "public"."documentos_emitidos_jovem" from "service_role";

revoke insert on table "public"."documentos_emitidos_jovem" from "service_role";

revoke references on table "public"."documentos_emitidos_jovem" from "service_role";

revoke select on table "public"."documentos_emitidos_jovem" from "service_role";

revoke trigger on table "public"."documentos_emitidos_jovem" from "service_role";

revoke truncate on table "public"."documentos_emitidos_jovem" from "service_role";

revoke update on table "public"."documentos_emitidos_jovem" from "service_role";

revoke delete on table "public"."internal_notes" from "anon";

revoke insert on table "public"."internal_notes" from "anon";

revoke references on table "public"."internal_notes" from "anon";

revoke select on table "public"."internal_notes" from "anon";

revoke trigger on table "public"."internal_notes" from "anon";

revoke truncate on table "public"."internal_notes" from "anon";

revoke update on table "public"."internal_notes" from "anon";

revoke delete on table "public"."internal_notes" from "authenticated";

revoke insert on table "public"."internal_notes" from "authenticated";

revoke references on table "public"."internal_notes" from "authenticated";

revoke select on table "public"."internal_notes" from "authenticated";

revoke trigger on table "public"."internal_notes" from "authenticated";

revoke truncate on table "public"."internal_notes" from "authenticated";

revoke update on table "public"."internal_notes" from "authenticated";

revoke delete on table "public"."internal_notes" from "service_role";

revoke insert on table "public"."internal_notes" from "service_role";

revoke references on table "public"."internal_notes" from "service_role";

revoke select on table "public"."internal_notes" from "service_role";

revoke trigger on table "public"."internal_notes" from "service_role";

revoke truncate on table "public"."internal_notes" from "service_role";

revoke update on table "public"."internal_notes" from "service_role";

revoke delete on table "public"."jovem_status_history" from "anon";

revoke insert on table "public"."jovem_status_history" from "anon";

revoke references on table "public"."jovem_status_history" from "anon";

revoke select on table "public"."jovem_status_history" from "anon";

revoke trigger on table "public"."jovem_status_history" from "anon";

revoke truncate on table "public"."jovem_status_history" from "anon";

revoke update on table "public"."jovem_status_history" from "anon";

revoke delete on table "public"."jovem_status_history" from "authenticated";

revoke insert on table "public"."jovem_status_history" from "authenticated";

revoke references on table "public"."jovem_status_history" from "authenticated";

revoke select on table "public"."jovem_status_history" from "authenticated";

revoke trigger on table "public"."jovem_status_history" from "authenticated";

revoke truncate on table "public"."jovem_status_history" from "authenticated";

revoke update on table "public"."jovem_status_history" from "authenticated";

revoke delete on table "public"."jovem_status_history" from "service_role";

revoke insert on table "public"."jovem_status_history" from "service_role";

revoke references on table "public"."jovem_status_history" from "service_role";

revoke select on table "public"."jovem_status_history" from "service_role";

revoke trigger on table "public"."jovem_status_history" from "service_role";

revoke truncate on table "public"."jovem_status_history" from "service_role";

revoke update on table "public"."jovem_status_history" from "service_role";

alter table "public"."atendimentos_agendados" drop constraint "atendimentos_agendados_modalidade_check";

alter table "public"."atendimentos_agendados" drop constraint "atendimentos_agendados_modalidade_dados_check";

alter table "public"."atendimentos_agendados" drop constraint "atendimentos_agendados_setor_check";

alter table "public"."avaliacoes_pedagogicas" drop constraint "avaliacoes_pedagogicas_modelo_encaminhamento_id_fkey";

alter table "public"."avaliacoes_pedagogicas" drop constraint "avaliacoes_pedagogicas_turma_id_fkey";

alter table "public"."avaliacoes_pedagogicas_anexos" drop constraint "avaliacoes_pedagogicas_anexos_avaliacao_id_fkey";

alter table "public"."avaliacoes_pedagogicas_anexos" drop constraint "avaliacoes_pedagogicas_anexos_created_by_fkey";

alter table "public"."avaliacoes_socioeconomicas_registros_sociais" drop constraint "avaliacoes_socioeconomicas_re_avaliacao_socioeconomica_id_r_key";

alter table "public"."avaliacoes_socioeconomicas_registros_sociais" drop constraint "avaliacoes_socioeconomicas_reg_avaliacao_socioeconomica_id_fkey";

alter table "public"."avaliacoes_socioeconomicas_registros_sociais" drop constraint "avaliacoes_socioeconomicas_registros_so_registro_social_id_fkey";

alter table "public"."certificacoes" drop constraint "certificacoes_notificar_antes_dias_check";

alter table "public"."config_modelos_documentos" drop constraint "config_modelos_documentos_created_by_fkey";

alter table "public"."config_modelos_documentos" drop constraint "config_modelos_documentos_tipo_check";

alter table "public"."config_motivos_intervencao" drop constraint "config_motivos_intervencao_setor_check";

alter table "public"."documentos_emitidos_jovem" drop constraint "documentos_emitidos_jovem_emitido_por_fkey";

alter table "public"."documentos_emitidos_jovem" drop constraint "documentos_emitidos_jovem_jovem_id_fkey";

alter table "public"."documentos_emitidos_jovem" drop constraint "documentos_emitidos_jovem_modelo_id_fkey";

alter table "public"."documentos_emitidos_jovem" drop constraint "documentos_emitidos_jovem_storage_path_key";

alter table "public"."documentos_emitidos_jovem" drop constraint "documentos_emitidos_jovem_tamanho_bytes_check";

alter table "public"."documentos_emitidos_jovem" drop constraint "documentos_emitidos_jovem_tipo_check";

alter table "public"."documentos_jovem" drop constraint "documentos_jovem_inscricao_id_fkey";

alter table "public"."documentos_jovem" drop constraint "documentos_jovem_ref_check";

alter table "public"."encaminhamentos" drop constraint "encaminhamentos_modelo_encaminhamento_id_fkey";

alter table "public"."internal_notes" drop constraint "internal_notes_created_by_fkey";

alter table "public"."internal_notes" drop constraint "internal_notes_jovem_id_fkey";

alter table "public"."intervencoes" drop constraint "intervencoes_setor_check";

alter table "public"."jovem_status_history" drop constraint "jovem_status_history_changed_by_fkey";

alter table "public"."jovem_status_history" drop constraint "jovem_status_history_jovem_id_fkey";

alter table "public"."certificacoes" drop constraint "certificacoes_status_check";

alter table "public"."documentos_jovem" drop constraint "documentos_jovem_tipo_check";

alter table "public"."inscricoes_jovens_aprendizes" drop constraint "inscricoes_jovens_aprendizes_status_check";

drop function if exists "public"."change_young_status"(p_jovem_id uuid, p_new_status public.jovem_status, p_reason text);

drop function if exists "public"."check_jovem_status_transition"();

drop function if exists "public"."ensure_certificacao_status_by_validade"();

drop function if exists "public"."generate_access_token"(p_cpf text, p_birth_date date);

drop function if exists "public"."log_jovem_status_change"();

drop function if exists "public"."normalize_cpf_digits"(p_cpf text);

drop function if exists "public"."notify_certificacao_validade_window"();

drop function if exists "public"."sync_certificacoes_status_by_validade"();

drop function if exists "public"."sync_motivo_intervencao_text"();

drop function if exists "public"."update_jovem_status"(p_jovem_id uuid, p_new_status public.jovem_status, p_reason text, p_allow_admin_override boolean);

drop function if exists "public"."validate_jovem_status_transition"(p_previous_status public.jovem_status, p_new_status public.jovem_status, p_allow_admin_override boolean);

drop function if exists "public"."validate_modelo_encaminhamento_active"();

drop function if exists "public"."validate_motivo_intervencao_active"();

drop function if exists "public"."validate_registro_social_active"();

alter table "public"."avaliacoes_pedagogicas_anexos" drop constraint "avaliacoes_pedagogicas_anexos_pkey";

alter table "public"."avaliacoes_socioeconomicas_registros_sociais" drop constraint "avaliacoes_socioeconomicas_registros_sociais_pkey";

alter table "public"."config_modelos_documentos" drop constraint "config_modelos_documentos_pkey";

alter table "public"."config_motivos_avaliacao_pedagogica" drop constraint "config_motivos_avaliacao_pedagogica_pkey";

alter table "public"."documentos_emitidos_jovem" drop constraint "documentos_emitidos_jovem_pkey";

alter table "public"."internal_notes" drop constraint "internal_notes_pkey";

alter table "public"."jovem_status_history" drop constraint "jovem_status_history_pkey";

drop index if exists "public"."avaliacoes_pedagogicas_anexos_pkey";

drop index if exists "public"."avaliacoes_socioeconomicas_re_avaliacao_socioeconomica_id_r_key";

drop index if exists "public"."avaliacoes_socioeconomicas_registros_sociais_pkey";

drop index if exists "public"."config_modelos_documentos_pkey";

drop index if exists "public"."config_motivos_avaliacao_pedagogica_pkey";

drop index if exists "public"."documentos_emitidos_jovem_pkey";

drop index if exists "public"."documentos_emitidos_jovem_storage_path_key";

drop index if exists "public"."idx_atendimentos_agendados_modalidade";

drop index if exists "public"."idx_atendimentos_agendados_setor";

drop index if exists "public"."idx_atendimentos_agendados_setor_data";

drop index if exists "public"."idx_audit_logs_action_type";

drop index if exists "public"."idx_audit_logs_changed_by";

drop index if exists "public"."idx_audit_logs_diff_json";

drop index if exists "public"."idx_audit_logs_entity_composite";

drop index if exists "public"."idx_avaliacoes_pedagogicas_anexos_avaliacao_id";

drop index if exists "public"."idx_avaliacoes_pedagogicas_modelo_encaminhamento_id";

drop index if exists "public"."idx_avaliacoes_pedagogicas_turma_id";

drop index if exists "public"."idx_avaliacoes_socio_registros_avaliacao_id";

drop index if exists "public"."idx_avaliacoes_socio_registros_registro_id";

drop index if exists "public"."idx_config_modelos_documentos_ativo";

drop index if exists "public"."idx_config_modelos_documentos_tipo";

drop index if exists "public"."idx_config_motivos_avaliacao_pedagogica_ativo";

drop index if exists "public"."idx_config_motivos_intervencao_setor_ativo_ordem";

drop index if exists "public"."idx_documentos_emitidos_jovem_emitido_em";

drop index if exists "public"."idx_documentos_emitidos_jovem_jovem_id";

drop index if exists "public"."idx_documentos_emitidos_jovem_tipo";

drop index if exists "public"."idx_documentos_jovem_inscricao_id";

drop index if exists "public"."idx_documentos_jovem_validade";

drop index if exists "public"."idx_encaminhamentos_modelo_encaminhamento_id";

drop index if exists "public"."idx_inscricoes_access_token";

drop index if exists "public"."idx_inscricoes_rejected";

drop index if exists "public"."idx_internal_notes_created_at";

drop index if exists "public"."idx_internal_notes_created_by";

drop index if exists "public"."idx_internal_notes_jovem_id";

drop index if exists "public"."idx_intervencoes_setor";

drop index if exists "public"."idx_intervencoes_setor_data";

drop index if exists "public"."idx_jovem_status_history_changed_at";

drop index if exists "public"."idx_jovem_status_history_jovem_id";

drop index if exists "public"."idx_jovens_access_token";

drop index if exists "public"."internal_notes_pkey";

drop index if exists "public"."jovem_status_history_pkey";

drop index if exists "public"."ux_config_motivos_avaliacao_pedagogica_nome";

drop table "public"."avaliacoes_pedagogicas_anexos";

drop table "public"."avaliacoes_socioeconomicas_registros_sociais";

drop table "public"."config_modelos_documentos";

drop table "public"."config_motivos_avaliacao_pedagogica";

drop table "public"."documentos_emitidos_jovem";

drop table "public"."internal_notes";

drop table "public"."jovem_status_history";

alter table "public"."jovens" alter column "status" drop default;

alter type "public"."jovem_status" rename to "jovem_status__old_version_to_be_dropped";

create type "public"."jovem_status" as enum ('ativo', 'inativo', 'desligado', 'formado', 'draft', 'completed', 'under_analysis', 'pending_documents', 'approved', 'rejected', 'active_apprentice', 'inactive', 'terminated', 'completed_program');

alter table "public"."jovens" alter column status type "public"."jovem_status" using status::text::"public"."jovem_status";

alter table "public"."jovens" alter column "status" set default 'active_apprentice'::public.jovem_status;

drop type "public"."jovem_status__old_version_to_be_dropped";

alter table "public"."atendimentos_agendados" drop column "link_atendimento";

alter table "public"."atendimentos_agendados" drop column "local_atendimento";

alter table "public"."atendimentos_agendados" drop column "modalidade";

alter table "public"."atendimentos_agendados" drop column "modelo_agendamento";

alter table "public"."atendimentos_agendados" drop column "setor";

alter table "public"."avaliacoes_pedagogicas" drop column "modelo_encaminhamento_id";

alter table "public"."avaliacoes_pedagogicas" drop column "turma_id";

alter table "public"."avaliacoes_pedagogicas" alter column "jovem_id" set not null;

alter table "public"."certificacoes" drop column "lembrete_validade_enviado_em";

alter table "public"."certificacoes" drop column "notificar_antes_dias";

alter table "public"."certificacoes" alter column "orgao_emissor" drop not null;

alter table "public"."certificacoes" alter column "tipo" drop default;

alter table "public"."config_motivos_intervencao" drop column "setor";

alter table "public"."conselho_classe" drop column "plano_acao_turma";

alter table "public"."conselho_classe_registros" drop column "descricao";

alter table "public"."conselho_classe_registros" drop column "dificuldades";

alter table "public"."conselho_classe_registros" drop column "plano_acao";

alter table "public"."documentos_jovem" drop column "inscricao_id";

alter table "public"."documentos_jovem" drop column "lembrete_vencimento_enviado_em";

alter table "public"."documentos_jovem" drop column "validade_em";

alter table "public"."documentos_jovem" alter column "jovem_id" set not null;

alter table "public"."encaminhamentos" drop column "modelo_encaminhamento_id";

alter table "public"."inscricoes_jovens_aprendizes" drop column "access_token";

alter table "public"."inscricoes_jovens_aprendizes" drop column "access_token_expires_at";

alter table "public"."inscricoes_jovens_aprendizes" drop column "last_access_request_at";

alter table "public"."intervencoes" drop column "setor";

alter table "public"."jovens" drop column "access_token";

alter table "public"."jovens" drop column "access_token_expires_at";

alter table "public"."jovens" drop column "last_access_request_at";

alter table "public"."certificacoes" add constraint "certificacoes_status_check" CHECK ((status = ANY (ARRAY['vigente'::text, 'vencida'::text, 'suspensa'::text, 'cancelada'::text]))) not valid;

alter table "public"."certificacoes" validate constraint "certificacoes_status_check";

alter table "public"."documentos_jovem" add constraint "documentos_jovem_tipo_check" CHECK ((tipo = ANY (ARRAY['rg'::text, 'cpf'::text, 'comprovante_endereco'::text, 'laudo_pcd'::text, 'outros'::text]))) not valid;

alter table "public"."documentos_jovem" validate constraint "documentos_jovem_tipo_check";

alter table "public"."inscricoes_jovens_aprendizes" add constraint "inscricoes_jovens_aprendizes_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'completed'::text, 'talent_bank'::text, 'under_analysis'::text, 'approved'::text, 'active_apprentice'::text]))) not valid;

alter table "public"."inscricoes_jovens_aprendizes" validate constraint "inscricoes_jovens_aprendizes_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_jovem_pendencias(p_jovem_id uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pendencias TEXT[] := '{}';
  v_status jovem_status;
  v_empresa_id UUID;
  v_required_docs TEXT[] := ARRAY['rg','cpf','comprovante_endereco'];
  v_tipo_doc TEXT;
  v_missing_docs BOOLEAN := false;
BEGIN
  SELECT j.status, j.empresa_id
  INTO v_status, v_empresa_id
  FROM public.jovens j
  WHERE j.id = p_jovem_id;

  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_socioeconomicas
    WHERE jovem_id = p_jovem_id
  ) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_socioeconomica_faltando');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_pedagogicas
    WHERE jovem_id = p_jovem_id
  ) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_pedagogica_faltando');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.intervencoes
    WHERE jovem_id = p_jovem_id
      AND tipo = 'intervencao'
  ) THEN
    v_pendencias := array_append(v_pendencias, 'sem_intervencoes');
  END IF;

  -- Comparar como texto para não falhar se o enum ainda for o antigo (ativo/inativo/desligado/formado)
  IF (v_status::text = 'active_apprentice' OR v_status::text = 'ativo') AND v_empresa_id IS NULL THEN
    v_pendencias := array_append(v_pendencias, 'sem_empresa_aprovado');
  END IF;

  FOREACH v_tipo_doc IN ARRAY v_required_docs LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.documentos_jovem dj
      WHERE dj.jovem_id = p_jovem_id
        AND dj.tipo = v_tipo_doc
        AND dj.status_validacao = 'aprovado'
    ) THEN
      v_missing_docs := true;
      EXIT;
    END IF;
  END LOOP;

  IF v_missing_docs THEN
    v_pendencias := array_append(v_pendencias, 'documentos_obrigatorios_faltando');
  END IF;

  RETURN v_pendencias;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.migrate_inscricao_to_jovem(inscricao_id uuid, empresa_id_param uuid DEFAULT NULL::uuid, turma_id_param uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inscricao_record public.inscricoes_jovens_aprendizes;
  novo_jovem_id UUID;
BEGIN
  -- Buscar inscrição
  SELECT * INTO inscricao_record
  FROM public.inscricoes_jovens_aprendizes
  WHERE id = inscricao_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição não encontrada';
  END IF;
  
  -- Verificar se já existe jovem vinculado
  IF inscricao_record.jovem_id IS NOT NULL THEN
    RETURN inscricao_record.jovem_id;
  END IF;
  
  -- Criar registro na tabela jovens
  INSERT INTO public.jovens (
    nome_completo,
    data_nascimento,
    cpf,
    rg,
    sexo,
    email,
    telefone,
    celular,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    responsavel_nome,
    responsavel_telefone,
    responsavel_parentesco,
    empresa_id,
    turma_id,
    status,
    data_admissao,
    observacoes,
    created_by
  ) VALUES (
    inscricao_record.nome_completo,
    inscricao_record.data_nascimento,
    inscricao_record.cpf,
    inscricao_record.rg,
    inscricao_record.sexo,
    inscricao_record.email,
    inscricao_record.contato_2,
    inscricao_record.contato_1,
    inscricao_record.cep,
    inscricao_record.logradouro,
    inscricao_record.numero,
    inscricao_record.complemento,
    inscricao_record.bairro,
    inscricao_record.cidade,
    inscricao_record.estado,
    inscricao_record.responsavel_nome,
    inscricao_record.responsavel_telefone,
    inscricao_record.responsavel_parentesco,
    COALESCE(empresa_id_param, inscricao_record.empresa_id),
    COALESCE(turma_id_param, inscricao_record.turma_id),
    'ativo',
    COALESCE(inscricao_record.data_contrato::DATE, CURRENT_DATE),
    inscricao_record.observacoes,
    auth.uid()
  )
  RETURNING id INTO novo_jovem_id;
  
  -- Atualizar inscrição com jovem_id
  UPDATE public.inscricoes_jovens_aprendizes
  SET jovem_id = novo_jovem_id,
      status = 'active_apprentice',
      updated_at = now()
  WHERE id = inscricao_id;
  
  RETURN novo_jovem_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_pendencia_notifications_for_jovem(p_jovem_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pendencias TEXT[];
  v_code TEXT;
  v_nome TEXT;
  v_message TEXT;
  v_role public.app_role;
  v_active_messages TEXT[] := '{}';
BEGIN
  IF p_jovem_id IS NULL THEN
    RETURN;
  END IF;

  SELECT nome_completo INTO v_nome
  FROM public.jovens
  WHERE id = p_jovem_id;

  IF v_nome IS NULL THEN
    RETURN;
  END IF;

  SELECT public.get_jovem_pendencias(p_jovem_id) INTO v_pendencias;
  IF v_pendencias IS NULL THEN
    v_pendencias := ARRAY[]::TEXT[];
  END IF;

  FOREACH v_code IN ARRAY v_pendencias LOOP
    v_role := NULL;
    v_message := NULL;

    CASE v_code
      WHEN 'avaliacao_socioeconomica_faltando' THEN
        v_role := 'analista_social';
        v_message := format('Pendência socioeconômica: registrar avaliação para %s', v_nome);
      WHEN 'avaliacao_pedagogica_faltando' THEN
        v_role := 'analista_pedagogico';
        v_message := format('Pendência pedagógica: registrar avaliação para %s', v_nome);
      WHEN 'sem_intervencoes' THEN
        v_role := 'analista_psicossocial';
        v_message := format('Pendência de intervenções: nenhum atendimento registrado para %s', v_nome);
      WHEN 'sem_empresa_aprovado' THEN
        v_role := 'gestor';
        v_message := format('Pendência administrativa: atribuir empresa para %s', v_nome);
      WHEN 'documentos_obrigatorios_faltando' THEN
        v_role := 'gestor';
        v_message := format('Documentos obrigatórios pendentes para %s', v_nome);
    END CASE;

    IF v_role IS NOT NULL AND v_message IS NOT NULL THEN
      v_active_messages := array_append(v_active_messages, v_message);
      IF NOT EXISTS (
        SELECT 1
        FROM public.notificacoes_internas
        WHERE jovem_id = p_jovem_id
          AND destinatario_role = v_role
          AND related_entity_type = 'pendencia'
          AND mensagem = v_message
          AND lida = false
      ) THEN
        PERFORM public.create_internal_notification(
          v_role,
          v_message,
          p_jovem_id,
          'pendencia',
          NULL
        );
      END IF;
    END IF;
  END LOOP;

  UPDATE public.notificacoes_internas
  SET lida = true
  WHERE jovem_id = p_jovem_id
    AND related_entity_type = 'pendencia'
    AND lida = false
    AND (
      array_length(v_active_messages, 1) IS NULL
      OR NOT (mensagem = ANY (v_active_messages))
    );
END;
$function$
;


  create policy "Authenticated users can manage inscricoes"
  on "public"."inscricoes_jovens_aprendizes"
  as permissive
  for all
  to authenticated
using (public.has_any_role(auth.uid()));



  create policy "Public can insert inscricoes"
  on "public"."inscricoes_jovens_aprendizes"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Public can read own inscricao"
  on "public"."inscricoes_jovens_aprendizes"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Public can update own inscricao"
  on "public"."inscricoes_jovens_aprendizes"
  as permissive
  for update
  to anon, authenticated
using (true);



  create policy "Public can insert jovens"
  on "public"."jovens"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Users with role can insert jovens"
  on "public"."jovens"
  as permissive
  for insert
  to authenticated
with check (public.has_any_role(auth.uid()));



  create policy "Users with role can update jovens"
  on "public"."jovens"
  as permissive
  for update
  to authenticated
using (public.has_any_role(auth.uid()));



  create policy "Users with role can view jovens"
  on "public"."jovens"
  as permissive
  for select
  to authenticated
using (public.has_any_role(auth.uid()));



  create policy "Staff atualizam notificaÃ§Ãµes do prÃ³prio papel"
  on "public"."notificacoes_internas"
  as permissive
  for update
  to authenticated
using ((public.has_any_role(auth.uid()) AND (public.has_role(auth.uid(), destinatario_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))
with check ((public.has_any_role(auth.uid()) AND (public.has_role(auth.uid(), destinatario_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));



  create policy "Staff enxergam notificaÃ§Ãµes por papel"
  on "public"."notificacoes_internas"
  as permissive
  for select
  to authenticated
using ((public.has_any_role(auth.uid()) AND (public.has_role(auth.uid(), destinatario_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));



  create policy "Staff inserem notificaÃ§Ãµes"
  on "public"."notificacoes_internas"
  as permissive
  for insert
  to authenticated
with check (public.has_any_role(auth.uid()));



  create policy "Usuário pode atualizar notificações do próprio papel"
  on "public"."notificacoes_internas"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), destinatario_role))
with check (public.has_role(auth.uid(), destinatario_role));



  create policy "Usuário pode ler notificações do próprio papel"
  on "public"."notificacoes_internas"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), destinatario_role));



