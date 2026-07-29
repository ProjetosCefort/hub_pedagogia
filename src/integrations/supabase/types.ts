export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acompanhamentos_sociais: {
        Row: {
          contexto_familiar: string | null
          created_at: string
          created_by: string | null
          data_registro: string
          descricao: string
          encaminhar_pedagogico: boolean
          encaminhar_psicossocial: boolean
          id: string
          jovem_id: string
          responsavel_id: string | null
          solicitacao_pedagogico_id: string | null
          solicitacao_psicossocial_id: string | null
          tipo_registro: string
          titulo: string
          updated_at: string
        }
        Insert: {
          contexto_familiar?: string | null
          created_at?: string
          created_by?: string | null
          data_registro?: string
          descricao: string
          encaminhar_pedagogico?: boolean
          encaminhar_psicossocial?: boolean
          id?: string
          jovem_id: string
          responsavel_id?: string | null
          solicitacao_pedagogico_id?: string | null
          solicitacao_psicossocial_id?: string | null
          tipo_registro: string
          titulo: string
          updated_at?: string
        }
        Update: {
          contexto_familiar?: string | null
          created_at?: string
          created_by?: string | null
          data_registro?: string
          descricao?: string
          encaminhar_pedagogico?: boolean
          encaminhar_psicossocial?: boolean
          id?: string
          jovem_id?: string
          responsavel_id?: string | null
          solicitacao_pedagogico_id?: string | null
          solicitacao_psicossocial_id?: string | null
          tipo_registro?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acompanhamentos_sociais_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acompanhamentos_sociais_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acompanhamentos_sociais_solicitacao_pedagogico_id_fkey"
            columns: ["solicitacao_pedagogico_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_setoriais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acompanhamentos_sociais_solicitacao_psicossocial_id_fkey"
            columns: ["solicitacao_psicossocial_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_setoriais"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos_agendados: {
        Row: {
          agendado_para: string
          created_at: string
          created_by: string | null
          descricao: string | null
          duracao_minutos: number | null
          id: string
          jovem_id: string | null
          link_atendimento: string | null
          local_atendimento: string | null
          modalidade: string
          modelo_agendamento: string | null
          publico_contato: string | null
          publico_descricao: string | null
          publico_externo: boolean
          publico_nome: string | null
          responsavel_id: string | null
          setor: string
          status: string
          tipo: string
          titulo: string
        }
        Insert: {
          agendado_para: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          jovem_id?: string | null
          link_atendimento?: string | null
          local_atendimento?: string | null
          modalidade?: string
          modelo_agendamento?: string | null
          publico_contato?: string | null
          publico_descricao?: string | null
          publico_externo?: boolean
          publico_nome?: string | null
          responsavel_id?: string | null
          setor?: string
          status?: string
          tipo: string
          titulo: string
        }
        Update: {
          agendado_para?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          jovem_id?: string | null
          link_atendimento?: string | null
          local_atendimento?: string | null
          modalidade?: string
          modelo_agendamento?: string | null
          publico_contato?: string | null
          publico_descricao?: string | null
          publico_externo?: boolean
          publico_nome?: string | null
          responsavel_id?: string | null
          setor?: string
          status?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_agendados_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos_agendados_anexos: {
        Row: {
          anexado_em: string
          anexado_por: string | null
          atendimento_id: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
        }
        Insert: {
          anexado_em?: string
          anexado_por?: string | null
          atendimento_id: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
        }
        Update: {
          anexado_em?: string
          anexado_por?: string | null
          atendimento_id?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_agendados_anexos_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos_agendados"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["audit_action_type"]
          changed_at: string
          changed_by: string
          diff_json: Json | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["audit_action_type"]
          changed_at?: string
          changed_by: string
          diff_json?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["audit_action_type"]
          changed_at?: string
          changed_by?: string
          diff_json?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      avaliacoes_pedagogicas: {
        Row: {
          aproveitamento_escolar_id: string | null
          assinatura_jovem: string | null
          assinatura_profissional: string | null
          created_at: string
          created_by: string | null
          data_avaliacao: string
          descricao_conducao: string | null
          dificuldades: string[]
          estrategias_aplicadas: string | null
          id: string
          jovem_id: string | null
          manifestacao_jovem: string | null
          modelo_encaminhamento_id: string | null
          motivo_intervencao: string
          motivo_intervencao_id: string | null
          parecer_final: string | null
          responsavel_id: string | null
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          aproveitamento_escolar_id?: string | null
          assinatura_jovem?: string | null
          assinatura_profissional?: string | null
          created_at?: string
          created_by?: string | null
          data_avaliacao: string
          descricao_conducao?: string | null
          dificuldades?: string[]
          estrategias_aplicadas?: string | null
          id?: string
          jovem_id?: string | null
          manifestacao_jovem?: string | null
          modelo_encaminhamento_id?: string | null
          motivo_intervencao: string
          motivo_intervencao_id?: string | null
          parecer_final?: string | null
          responsavel_id?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          aproveitamento_escolar_id?: string | null
          assinatura_jovem?: string | null
          assinatura_profissional?: string | null
          created_at?: string
          created_by?: string | null
          data_avaliacao?: string
          descricao_conducao?: string | null
          dificuldades?: string[]
          estrategias_aplicadas?: string | null
          id?: string
          jovem_id?: string | null
          manifestacao_jovem?: string | null
          modelo_encaminhamento_id?: string | null
          motivo_intervencao?: string
          motivo_intervencao_id?: string | null
          parecer_final?: string | null
          responsavel_id?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_pedagogicas_aproveitamento_escolar_id_fkey"
            columns: ["aproveitamento_escolar_id"]
            isOneToOne: false
            referencedRelation: "config_aproveitamento_escolar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_pedagogicas_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_pedagogicas_modelo_encaminhamento_id_fkey"
            columns: ["modelo_encaminhamento_id"]
            isOneToOne: false
            referencedRelation: "config_modelos_encaminhamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_pedagogicas_motivo_intervencao_id_fkey"
            columns: ["motivo_intervencao_id"]
            isOneToOne: false
            referencedRelation: "config_motivos_intervencao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_pedagogicas_responsavel_id_profiles_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_pedagogicas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_praticas: {
        Row: {
          avaliador_email: string | null
          avaliador_nome: string | null
          competencia_assiduidade: string | null
          competencia_comunicacao: string | null
          competencia_proatividade: string | null
          competencia_responsabilidade: string | null
          competencia_trabalho_equipe: string | null
          created_at: string
          created_by: string | null
          data_resposta: string | null
          data_solicitacao: string
          data_validacao: string | null
          empresa_id: string | null
          feedback_fornecido: boolean | null
          id: string
          jovem_id: string
          justificativa_turno: string | null
          manteve_turno_contrato: boolean | null
          medidas_disciplinares: boolean | null
          motivos_medidas_disciplinares: string | null
          observacoes: string | null
          parecer_empresa: string | null
          parecer_interno: string | null
          pontos_fortes: string | null
          pontos_melhoria: string | null
          proxima_data_envio: string | null
          quantidade_feedbacks: number | null
          quantidade_medidas_disciplinares: number | null
          responsavel_id: string | null
          resumo_atividades: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avaliador_email?: string | null
          avaliador_nome?: string | null
          competencia_assiduidade?: string | null
          competencia_comunicacao?: string | null
          competencia_proatividade?: string | null
          competencia_responsabilidade?: string | null
          competencia_trabalho_equipe?: string | null
          created_at?: string
          created_by?: string | null
          data_resposta?: string | null
          data_solicitacao?: string
          data_validacao?: string | null
          empresa_id?: string | null
          feedback_fornecido?: boolean | null
          id?: string
          jovem_id: string
          justificativa_turno?: string | null
          manteve_turno_contrato?: boolean | null
          medidas_disciplinares?: boolean | null
          motivos_medidas_disciplinares?: string | null
          observacoes?: string | null
          parecer_empresa?: string | null
          parecer_interno?: string | null
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
          proxima_data_envio?: string | null
          quantidade_feedbacks?: number | null
          quantidade_medidas_disciplinares?: number | null
          responsavel_id?: string | null
          resumo_atividades?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avaliador_email?: string | null
          avaliador_nome?: string | null
          competencia_assiduidade?: string | null
          competencia_comunicacao?: string | null
          competencia_proatividade?: string | null
          competencia_responsabilidade?: string | null
          competencia_trabalho_equipe?: string | null
          created_at?: string
          created_by?: string | null
          data_resposta?: string | null
          data_solicitacao?: string
          data_validacao?: string | null
          empresa_id?: string | null
          feedback_fornecido?: boolean | null
          id?: string
          jovem_id?: string
          justificativa_turno?: string | null
          manteve_turno_contrato?: boolean | null
          medidas_disciplinares?: boolean | null
          motivos_medidas_disciplinares?: string | null
          observacoes?: string | null
          parecer_empresa?: string | null
          parecer_interno?: string | null
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
          proxima_data_envio?: string | null
          quantidade_feedbacks?: number | null
          quantidade_medidas_disciplinares?: number | null
          responsavel_id?: string | null
          resumo_atividades?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_praticas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_praticas_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_praticas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_socioeconomicas: {
        Row: {
          beneficios_sociais: string | null
          cadunico_status: string | null
          composicao_familiar: Json | null
          cras: string | null
          creas: string | null
          created_at: string
          created_by: string | null
          data_avaliacao: string
          id: string
          jovem_id: string
          moradia_tipo: string | null
          nis: string | null
          observacoes: string | null
          pcd_status: string | null
          possui_energia: boolean | null
          possui_saneamento: boolean | null
          problemas_saude: string | null
          quantidade_membros: number | null
          renda_familiar: number | null
          responsavel_id: string | null
          situacao_moradia: string | null
          tipo_deficiencia: string | null
          updated_at: string
        }
        Insert: {
          beneficios_sociais?: string | null
          cadunico_status?: string | null
          composicao_familiar?: Json | null
          cras?: string | null
          creas?: string | null
          created_at?: string
          created_by?: string | null
          data_avaliacao: string
          id?: string
          jovem_id: string
          moradia_tipo?: string | null
          nis?: string | null
          observacoes?: string | null
          pcd_status?: string | null
          possui_energia?: boolean | null
          possui_saneamento?: boolean | null
          problemas_saude?: string | null
          quantidade_membros?: number | null
          renda_familiar?: number | null
          responsavel_id?: string | null
          situacao_moradia?: string | null
          tipo_deficiencia?: string | null
          updated_at?: string
        }
        Update: {
          beneficios_sociais?: string | null
          cadunico_status?: string | null
          composicao_familiar?: Json | null
          cras?: string | null
          creas?: string | null
          created_at?: string
          created_by?: string | null
          data_avaliacao?: string
          id?: string
          jovem_id?: string
          moradia_tipo?: string | null
          nis?: string | null
          observacoes?: string | null
          pcd_status?: string | null
          possui_energia?: boolean | null
          possui_saneamento?: boolean | null
          problemas_saude?: string | null
          quantidade_membros?: number | null
          renda_familiar?: number | null
          responsavel_id?: string | null
          situacao_moradia?: string | null
          tipo_deficiencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_socioeconomicas_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_socioeconomicas_responsavel_id_profiles_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificacao_anexos: {
        Row: {
          certificacao_id: string
          created_at: string
          created_by: string | null
          id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
        }
        Insert: {
          certificacao_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
        }
        Update: {
          certificacao_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certificacao_anexos_certificacao_id_fkey"
            columns: ["certificacao_id"]
            isOneToOne: false
            referencedRelation: "certificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      certificacoes: {
        Row: {
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_validade: string | null
          id: string
          lembrete_validade_enviado_em: string | null
          notificar_antes_dias: number
          observacoes: string | null
          orgao_emissor: string
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          lembrete_validade_enviado_em?: string | null
          notificar_antes_dias?: number
          observacoes?: string | null
          orgao_emissor: string
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          lembrete_validade_enviado_em?: string | null
          notificar_antes_dias?: number
          observacoes?: string | null
          orgao_emissor?: string
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_aproveitamento_escolar: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      config_modelos_documentos: {
        Row: {
          alinhamento: string
          ativo: boolean
          corpo_template: string | null
          created_at: string
          descricao: string | null
          fonte_familia: string
          fonte_tamanho: number
          id: string
          imagem_posicao: string
          imagem_url: string | null
          logo_url: string | null
          negrito: boolean
          nome: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          alinhamento?: string
          ativo?: boolean
          corpo_template?: string | null
          created_at?: string
          descricao?: string | null
          fonte_familia?: string
          fonte_tamanho?: number
          id?: string
          imagem_posicao?: string
          imagem_url?: string | null
          logo_url?: string | null
          negrito?: boolean
          nome: string
          ordem?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          alinhamento?: string
          ativo?: boolean
          corpo_template?: string | null
          created_at?: string
          descricao?: string | null
          fonte_familia?: string
          fonte_tamanho?: number
          id?: string
          imagem_posicao?: string
          imagem_url?: string | null
          logo_url?: string | null
          negrito?: boolean
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_modelos_encaminhamento: {
        Row: {
          area_destino: string | null
          ativo: boolean | null
          corpo_template: string | null
          created_at: string | null
          created_by: string | null
          id: string
          instituicao_destino: string | null
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          area_destino?: string | null
          ativo?: boolean | null
          corpo_template?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          instituicao_destino?: string | null
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          area_destino?: string | null
          ativo?: boolean | null
          corpo_template?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          instituicao_destino?: string | null
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      config_motivos_avaliacao_pedagogica: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_motivos_intervencao: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          setor: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          setor?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          setor?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      config_parametros: {
        Row: {
          categoria: string | null
          chave: string
          created_at: string | null
          descricao: string | null
          editavel: boolean | null
          id: string
          nome_exibicao: string
          opcoes_select: string | null
          tipo: string | null
          updated_at: string | null
          updated_by: string | null
          valor: string | null
        }
        Insert: {
          categoria?: string | null
          chave: string
          created_at?: string | null
          descricao?: string | null
          editavel?: boolean | null
          id?: string
          nome_exibicao: string
          opcoes_select?: string | null
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor?: string | null
        }
        Update: {
          categoria?: string | null
          chave?: string
          created_at?: string | null
          descricao?: string | null
          editavel?: boolean | null
          id?: string
          nome_exibicao?: string
          opcoes_select?: string | null
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      config_registros_sociais: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          sigla: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          sigla?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          sigla?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conselho_classe: {
        Row: {
          created_at: string
          created_by: string | null
          data_reuniao: string
          id: string
          parecer: string | null
          pauta: string | null
          periodo: string | null
          status: string
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_reuniao: string
          id?: string
          parecer?: string | null
          pauta?: string | null
          periodo?: string | null
          status?: string
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_reuniao?: string
          id?: string
          parecer?: string | null
          pauta?: string | null
          periodo?: string | null
          status?: string
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conselho_classe_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      conselho_classe_anexos: {
        Row: {
          anexado_em: string
          anexado_por: string | null
          conselho_id: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
        }
        Insert: {
          anexado_em?: string
          anexado_por?: string | null
          conselho_id: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
        }
        Update: {
          anexado_em?: string
          anexado_por?: string | null
          conselho_id?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conselho_classe_anexos_conselho_id_fkey"
            columns: ["conselho_id"]
            isOneToOne: false
            referencedRelation: "conselho_classe"
            referencedColumns: ["id"]
          },
        ]
      }
      conselho_classe_registros: {
        Row: {
          conselho_id: string
          created_at: string
          created_by: string | null
          id: string
          jovem_id: string | null
          participante_cargo: string | null
          participante_nome: string | null
          registro: string | null
        }
        Insert: {
          conselho_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          jovem_id?: string | null
          participante_cargo?: string | null
          participante_nome?: string | null
          registro?: string | null
        }
        Update: {
          conselho_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          jovem_id?: string | null
          participante_cargo?: string | null
          participante_nome?: string | null
          registro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conselho_classe_registros_conselho_id_fkey"
            columns: ["conselho_id"]
            isOneToOne: false
            referencedRelation: "conselho_classe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conselho_classe_registros_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      curso_unidades: {
        Row: {
          created_at: string
          created_by: string | null
          curso_id: string
          gov_validacao_id: string | null
          id: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          curso_id: string
          gov_validacao_id?: string | null
          id?: string
          unidade_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          curso_id?: string
          gov_validacao_id?: string | null
          id?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curso_unidades_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curso_unidades_gov_validacao_id_fkey"
            columns: ["gov_validacao_id"]
            isOneToOne: false
            referencedRelation: "gov_validacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curso_unidades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          ementa_id: string | null
          gov_notificar_antes_dias: number
          gov_protocolo: string | null
          gov_repetir_notificacao_quinzenal: boolean
          gov_ultimo_lembrete_em: string | null
          gov_validacao_id: string | null
          gov_vigencia_fim: string | null
          gov_vigencia_inicio: string | null
          id: string
          nome: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          ementa_id?: string | null
          gov_notificar_antes_dias?: number
          gov_protocolo?: string | null
          gov_repetir_notificacao_quinzenal?: boolean
          gov_ultimo_lembrete_em?: string | null
          gov_validacao_id?: string | null
          gov_vigencia_fim?: string | null
          gov_vigencia_inicio?: string | null
          id?: string
          nome: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          ementa_id?: string | null
          gov_notificar_antes_dias?: number
          gov_protocolo?: string | null
          gov_repetir_notificacao_quinzenal?: boolean
          gov_ultimo_lembrete_em?: string | null
          gov_validacao_id?: string | null
          gov_vigencia_fim?: string | null
          gov_vigencia_inicio?: string | null
          id?: string
          nome?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cursos_ementa_id_fkey"
            columns: ["ementa_id"]
            isOneToOne: false
            referencedRelation: "ementas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_gov_validacao_id_fkey"
            columns: ["gov_validacao_id"]
            isOneToOne: false
            referencedRelation: "gov_validacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          carga_horaria: number
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          numero_encontros: number
          tipo_modulo: string
          updated_at: string
        }
        Insert: {
          carga_horaria: number
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          numero_encontros: number
          tipo_modulo: string
          updated_at?: string
        }
        Update: {
          carga_horaria?: number
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          numero_encontros?: number
          tipo_modulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_emitidos_jovem: {
        Row: {
          created_at: string
          emitido_em: string
          emitido_por: string | null
          id: string
          jovem_id: string
          mime_type: string | null
          modelo_id: string | null
          nome_arquivo: string
          observacao: string | null
          storage_path: string
          tamanho_bytes: number | null
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          emitido_em?: string
          emitido_por?: string | null
          id?: string
          jovem_id: string
          mime_type?: string | null
          modelo_id?: string | null
          nome_arquivo: string
          observacao?: string | null
          storage_path: string
          tamanho_bytes?: number | null
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string
          emitido_em?: string
          emitido_por?: string | null
          id?: string
          jovem_id?: string
          mime_type?: string | null
          modelo_id?: string | null
          nome_arquivo?: string
          observacao?: string | null
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_emitidos_jovem_emitido_por_fkey"
            columns: ["emitido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_emitidos_jovem_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_emitidos_jovem_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "config_modelos_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_jovem: {
        Row: {
          enviado_em: string
          enviado_por: string | null
          id: string
          inscricao_id: string | null
          jovem_id: string | null
          lembrete_vencimento_enviado_em: string | null
          mime_type: string | null
          nome_arquivo: string
          observacao_validacao: string | null
          status_validacao: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: string
          validade_em: string | null
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          enviado_em?: string
          enviado_por?: string | null
          id?: string
          inscricao_id?: string | null
          jovem_id?: string | null
          lembrete_vencimento_enviado_em?: string | null
          mime_type?: string | null
          nome_arquivo: string
          observacao_validacao?: string | null
          status_validacao?: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo: string
          validade_em?: string | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          enviado_em?: string
          enviado_por?: string | null
          id?: string
          inscricao_id?: string | null
          jovem_id?: string | null
          lembrete_vencimento_enviado_em?: string | null
          mime_type?: string | null
          nome_arquivo?: string
          observacao_validacao?: string | null
          status_validacao?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: string
          validade_em?: string | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_jovem_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_jovens_aprendizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_jovem_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      ementa_disciplinas: {
        Row: {
          created_at: string
          disciplina_id: string
          ementa_id: string
          id: string
          ordem: number
        }
        Insert: {
          created_at?: string
          disciplina_id: string
          ementa_id: string
          id?: string
          ordem?: number
        }
        Update: {
          created_at?: string
          disciplina_id?: string
          ementa_id?: string
          id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "ementa_disciplinas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ementa_disciplinas_ementa_id_fkey"
            columns: ["ementa_id"]
            isOneToOne: false
            referencedRelation: "ementas"
            referencedColumns: ["id"]
          },
        ]
      }
      ementas: {
        Row: {
          carga_horaria_pratica: number
          carga_horaria_teorica: number
          cbo_tipo: string
          cbos: string[]
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          carga_horaria_pratica?: number
          carga_horaria_teorica?: number
          cbo_tipo?: string
          cbos?: string[]
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          carga_horaria_pratica?: number
          carga_horaria_teorica?: number
          cbo_tipo?: string
          cbos?: string[]
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          responsavel_nome: string | null
          responsavel_telefone: string | null
          telefone: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          telefone?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      encaminhamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_encaminhamento: string
          descricao_encaminhamento: string | null
          destino_cargo: string | null
          destino_contato: string | null
          destino_instituicao: string
          destino_nome: string
          id: string
          jovem_id: string
          referencia_rede: string | null
          responsavel_id: string | null
          retorno_previsto: string | null
          tipo_rede: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_encaminhamento: string
          descricao_encaminhamento?: string | null
          destino_cargo?: string | null
          destino_contato?: string | null
          destino_instituicao: string
          destino_nome: string
          id?: string
          jovem_id: string
          referencia_rede?: string | null
          responsavel_id?: string | null
          retorno_previsto?: string | null
          tipo_rede?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_encaminhamento?: string
          descricao_encaminhamento?: string | null
          destino_cargo?: string | null
          destino_contato?: string | null
          destino_instituicao?: string
          destino_nome?: string
          id?: string
          jovem_id?: string
          referencia_rede?: string | null
          responsavel_id?: string | null
          retorno_previsto?: string | null
          tipo_rede?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encaminhamentos_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encaminhamentos_responsavel_id_profiles_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frequencia_jovem: {
        Row: {
          created_at: string
          created_by: string | null
          data_registro: string
          id: string
          jovem_id: string
          observacoes: string | null
          origem: string
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_registro: string
          id?: string
          jovem_id: string
          observacoes?: string | null
          origem?: string
          responsavel_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_registro?: string
          id?: string
          jovem_id?: string
          observacoes?: string | null
          origem?: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "frequencia_jovem_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_jovem_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_validacoes: {
        Row: {
          alerta_antecedencia_dias: number
          created_at: string
          created_by: string | null
          ementa_id: string
          id: string
          nome: string
          numero_curso_mte: string | null
          protocolo: string
          status: string
          ultimo_alerta_em: string | null
          unidade_id: string
          updated_at: string
          vigencia_atual: string | null
          vigencia_final: string | null
        }
        Insert: {
          alerta_antecedencia_dias?: number
          created_at?: string
          created_by?: string | null
          ementa_id: string
          id?: string
          nome: string
          numero_curso_mte?: string | null
          protocolo: string
          status?: string
          ultimo_alerta_em?: string | null
          unidade_id: string
          updated_at?: string
          vigencia_atual?: string | null
          vigencia_final?: string | null
        }
        Update: {
          alerta_antecedencia_dias?: number
          created_at?: string
          created_by?: string | null
          ementa_id?: string
          id?: string
          nome?: string
          numero_curso_mte?: string | null
          protocolo?: string
          status?: string
          ultimo_alerta_em?: string | null
          unidade_id?: string
          updated_at?: string
          vigencia_atual?: string | null
          vigencia_final?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_validacoes_ementa_id_fkey"
            columns: ["ementa_id"]
            isOneToOne: false
            referencedRelation: "ementas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_validacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricao_notas_internas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inscricao_id: string
          jovem_id: string | null
          note: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inscricao_id: string
          jovem_id?: string | null
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inscricao_id?: string
          jovem_id?: string | null
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_notas_internas_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_jovens_aprendizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_notas_internas_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_jovens_aprendizes: {
        Row: {
          acompanhamento_medico: boolean | null
          aprovado_por: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          completed_at: string | null
          composicao_familiar: Json | null
          contato_1: string | null
          contato_2: string | null
          contatos_mensagem: Json | null
          cpf: string
          created_at: string
          current_step: number | null
          data_aprovacao: string | null
          data_contrato: string | null
          data_nascimento: string | null
          descricao_acompanhamento: string | null
          descricao_beneficio: string | null
          descricao_deficiencia: string | null
          descricao_doenca: string | null
          descricao_pcd: string | null
          descricao_programa: string | null
          e_estrangeiro: boolean | null
          e_pcd: boolean | null
          edit_token: string | null
          email: string
          empresa_id: string | null
          esta_estudando: boolean | null
          estado: string | null
          habilidades_computador: string | null
          id: string
          jovem_id: string | null
          laudo_medico_url: string | null
          logradouro: string | null
          nivel_educacao: string | null
          nivel_pcd: string | null
          nome_completo: string | null
          nome_social: string | null
          notas_internas: string | null
          numero: string | null
          numero_ctps: string | null
          observacoes: string | null
          pais_origem: string | null
          participa_programa_social: boolean | null
          periodo_estudo: string | null
          pis_pasep: string | null
          possui_deficiencia: boolean | null
          possui_doenca_cronica: boolean | null
          possui_energia: boolean | null
          possui_saneamento: boolean | null
          quantidade_membros: number | null
          raca: string | null
          recebe_beneficio: boolean | null
          registros_sociais_ids: string[]
          regiao_metropolitana: boolean | null
          renda_familiar: number | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_parentesco: string | null
          responsavel_telefone: string | null
          rg: string | null
          sexo: string | null
          situacao_moradia: string | null
          status: string
          step1_completed_at: string | null
          step2_completed_at: string | null
          step3_completed_at: string | null
          tamanho_calcado: string | null
          tamanho_uniforme: string | null
          tem_ctps_digital: boolean | null
          tem_nome_social: boolean | null
          tipo_moradia: string | null
          token_expires_at: string | null
          turma_id: string | null
          unidade_preferencia: string | null
          updated_at: string
        }
        Insert: {
          acompanhamento_medico?: boolean | null
          aprovado_por?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          completed_at?: string | null
          composicao_familiar?: Json | null
          contato_1?: string | null
          contato_2?: string | null
          contatos_mensagem?: Json | null
          cpf: string
          created_at?: string
          current_step?: number | null
          data_aprovacao?: string | null
          data_contrato?: string | null
          data_nascimento?: string | null
          descricao_acompanhamento?: string | null
          descricao_beneficio?: string | null
          descricao_deficiencia?: string | null
          descricao_doenca?: string | null
          descricao_pcd?: string | null
          descricao_programa?: string | null
          e_estrangeiro?: boolean | null
          e_pcd?: boolean | null
          edit_token?: string | null
          email: string
          empresa_id?: string | null
          esta_estudando?: boolean | null
          estado?: string | null
          habilidades_computador?: string | null
          id?: string
          jovem_id?: string | null
          laudo_medico_url?: string | null
          logradouro?: string | null
          nivel_educacao?: string | null
          nivel_pcd?: string | null
          nome_completo?: string | null
          nome_social?: string | null
          notas_internas?: string | null
          numero?: string | null
          numero_ctps?: string | null
          observacoes?: string | null
          pais_origem?: string | null
          participa_programa_social?: boolean | null
          periodo_estudo?: string | null
          pis_pasep?: string | null
          possui_deficiencia?: boolean | null
          possui_doenca_cronica?: boolean | null
          possui_energia?: boolean | null
          possui_saneamento?: boolean | null
          quantidade_membros?: number | null
          raca?: string | null
          recebe_beneficio?: boolean | null
          registros_sociais_ids?: string[]
          regiao_metropolitana?: boolean | null
          renda_familiar?: number | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          responsavel_telefone?: string | null
          rg?: string | null
          sexo?: string | null
          situacao_moradia?: string | null
          status?: string
          step1_completed_at?: string | null
          step2_completed_at?: string | null
          step3_completed_at?: string | null
          tamanho_calcado?: string | null
          tamanho_uniforme?: string | null
          tem_ctps_digital?: boolean | null
          tem_nome_social?: boolean | null
          tipo_moradia?: string | null
          token_expires_at?: string | null
          turma_id?: string | null
          unidade_preferencia?: string | null
          updated_at?: string
        }
        Update: {
          acompanhamento_medico?: boolean | null
          aprovado_por?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          completed_at?: string | null
          composicao_familiar?: Json | null
          contato_1?: string | null
          contato_2?: string | null
          contatos_mensagem?: Json | null
          cpf?: string
          created_at?: string
          current_step?: number | null
          data_aprovacao?: string | null
          data_contrato?: string | null
          data_nascimento?: string | null
          descricao_acompanhamento?: string | null
          descricao_beneficio?: string | null
          descricao_deficiencia?: string | null
          descricao_doenca?: string | null
          descricao_pcd?: string | null
          descricao_programa?: string | null
          e_estrangeiro?: boolean | null
          e_pcd?: boolean | null
          edit_token?: string | null
          email?: string
          empresa_id?: string | null
          esta_estudando?: boolean | null
          estado?: string | null
          habilidades_computador?: string | null
          id?: string
          jovem_id?: string | null
          laudo_medico_url?: string | null
          logradouro?: string | null
          nivel_educacao?: string | null
          nivel_pcd?: string | null
          nome_completo?: string | null
          nome_social?: string | null
          notas_internas?: string | null
          numero?: string | null
          numero_ctps?: string | null
          observacoes?: string | null
          pais_origem?: string | null
          participa_programa_social?: boolean | null
          periodo_estudo?: string | null
          pis_pasep?: string | null
          possui_deficiencia?: boolean | null
          possui_doenca_cronica?: boolean | null
          possui_energia?: boolean | null
          possui_saneamento?: boolean | null
          quantidade_membros?: number | null
          raca?: string | null
          recebe_beneficio?: boolean | null
          registros_sociais_ids?: string[]
          regiao_metropolitana?: boolean | null
          renda_familiar?: number | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          responsavel_telefone?: string | null
          rg?: string | null
          sexo?: string | null
          situacao_moradia?: string | null
          status?: string
          step1_completed_at?: string | null
          step2_completed_at?: string | null
          step3_completed_at?: string | null
          tamanho_calcado?: string | null
          tamanho_uniforme?: string | null
          tem_ctps_digital?: boolean | null
          tem_nome_social?: boolean | null
          tipo_moradia?: string | null
          token_expires_at?: string | null
          turma_id?: string | null
          unidade_preferencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_jovens_aprendizes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_jovens_aprendizes_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_jovens_aprendizes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_reprovacoes: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          inscricao_id: string
          motivo: string
          observacao: string | null
          origem: string
          retornada_ao_banco_em: string | null
          retornada_por: string | null
          retorno_observacao: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          inscricao_id: string
          motivo: string
          observacao?: string | null
          origem?: string
          retornada_ao_banco_em?: string | null
          retornada_por?: string | null
          retorno_observacao?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          inscricao_id?: string
          motivo?: string
          observacao?: string | null
          origem?: string
          retornada_ao_banco_em?: string | null
          retornada_por?: string | null
          retorno_observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_reprovacoes_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_jovens_aprendizes"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          inscricao_id: string
          metadata: Json
          motivo: string | null
          new_status: string
          observacao: string | null
          origem: string
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          inscricao_id: string
          metadata?: Json
          motivo?: string | null
          new_status: string
          observacao?: string | null
          origem?: string
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          inscricao_id?: string
          metadata?: Json
          motivo?: string | null
          new_status?: string
          observacao?: string | null
          origem?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_status_history_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_jovens_aprendizes"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_email: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          connected_by: string | null
          created_at: string
          id: string
          last_connected_at: string
          provider: string
          refresh_token: string
          scope: string | null
          sender_email: string
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          last_connected_at?: string
          provider: string
          refresh_token: string
          scope?: string | null
          sender_email: string
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          last_connected_at?: string
          provider?: string
          refresh_token?: string
          scope?: string | null
          sender_email?: string
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          jovem_id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          jovem_id: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          jovem_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencoes: {
        Row: {
          conclusao: string | null
          created_at: string
          created_by: string | null
          data_atendimento: string
          descricao_demanda: string
          id: string
          jovem_id: string
          motivo_intervencao: string | null
          motivo_intervencao_id: string | null
          percepcao_profissional: string | null
          plano_acao: string | null
          relato_jovem: string | null
          responsavel_id: string | null
          setor: string
          tipo: Database["public"]["Enums"]["tipo_atendimento"]
          updated_at: string
        }
        Insert: {
          conclusao?: string | null
          created_at?: string
          created_by?: string | null
          data_atendimento: string
          descricao_demanda: string
          id?: string
          jovem_id: string
          motivo_intervencao?: string | null
          motivo_intervencao_id?: string | null
          percepcao_profissional?: string | null
          plano_acao?: string | null
          relato_jovem?: string | null
          responsavel_id?: string | null
          setor?: string
          tipo?: Database["public"]["Enums"]["tipo_atendimento"]
          updated_at?: string
        }
        Update: {
          conclusao?: string | null
          created_at?: string
          created_by?: string | null
          data_atendimento?: string
          descricao_demanda?: string
          id?: string
          jovem_id?: string
          motivo_intervencao?: string | null
          motivo_intervencao_id?: string | null
          percepcao_profissional?: string | null
          plano_acao?: string | null
          relato_jovem?: string | null
          responsavel_id?: string | null
          setor?: string
          tipo?: Database["public"]["Enums"]["tipo_atendimento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervencoes_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencoes_motivo_intervencao_id_fkey"
            columns: ["motivo_intervencao_id"]
            isOneToOne: false
            referencedRelation: "config_motivos_intervencao"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencoes_coletivas: {
        Row: {
          created_at: string
          created_by: string | null
          data_intervencao: string
          descricao: string
          empresa_id: string | null
          id: string
          motivo_intervencao: string | null
          motivo_intervencao_id: string | null
          proximo_agendamento_em: string | null
          proximo_agendamento_id: string | null
          responsavel_id: string | null
          setor: string
          tipo_publico: string
          titulo: string
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_intervencao: string
          descricao: string
          empresa_id?: string | null
          id?: string
          motivo_intervencao?: string | null
          motivo_intervencao_id?: string | null
          proximo_agendamento_em?: string | null
          proximo_agendamento_id?: string | null
          responsavel_id?: string | null
          setor?: string
          tipo_publico: string
          titulo: string
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_intervencao?: string
          descricao?: string
          empresa_id?: string | null
          id?: string
          motivo_intervencao?: string | null
          motivo_intervencao_id?: string | null
          proximo_agendamento_em?: string | null
          proximo_agendamento_id?: string | null
          responsavel_id?: string | null
          setor?: string
          tipo_publico?: string
          titulo?: string
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervencoes_coletivas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencoes_coletivas_motivo_intervencao_id_fkey"
            columns: ["motivo_intervencao_id"]
            isOneToOne: false
            referencedRelation: "config_motivos_intervencao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencoes_coletivas_proximo_agendamento_id_fkey"
            columns: ["proximo_agendamento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos_agendados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencoes_coletivas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencoes_coletivas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencoes_coletivas_participantes: {
        Row: {
          created_at: string
          id: string
          intervencao_coletiva_id: string
          jovem_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intervencao_coletiva_id: string
          jovem_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intervencao_coletiva_id?: string
          jovem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervencoes_coletivas_participant_intervencao_coletiva_id_fkey"
            columns: ["intervencao_coletiva_id"]
            isOneToOne: false
            referencedRelation: "intervencoes_coletivas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencoes_coletivas_participantes_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      jovem_vaga_vinculos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inscricao_id: string | null
          jovem_id: string | null
          observacoes: string | null
          status: string
          updated_at: string
          vaga_ref: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inscricao_id?: string | null
          jovem_id?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          vaga_ref: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inscricao_id?: string | null
          jovem_id?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          vaga_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "jovem_vaga_vinculos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_jovens_aprendizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jovem_vaga_vinculos_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      jovens: {
        Row: {
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_admissao: string | null
          data_desligamento: string | null
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          estado: string | null
          estado_civil: string | null
          foto_url: string | null
          id: string
          logradouro: string | null
          matricula: string | null
          nacionalidade: string | null
          naturalidade: string | null
          nome_completo: string
          nome_mae: string | null
          nome_pai: string | null
          numero: string | null
          observacoes: string | null
          raca: string | null
          responsavel_nome: string | null
          responsavel_parentesco: string | null
          responsavel_telefone: string | null
          rg: string | null
          sexo: string | null
          status: Database["public"]["Enums"]["jovem_status"]
          telefone: string | null
          turma_id: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          estado?: string | null
          estado_civil?: string | null
          foto_url?: string | null
          id?: string
          logradouro?: string | null
          matricula?: string | null
          nacionalidade?: string | null
          naturalidade?: string | null
          nome_completo: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          observacoes?: string | null
          raca?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          responsavel_telefone?: string | null
          rg?: string | null
          sexo?: string | null
          status?: Database["public"]["Enums"]["jovem_status"]
          telefone?: string | null
          turma_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          estado?: string | null
          estado_civil?: string | null
          foto_url?: string | null
          id?: string
          logradouro?: string | null
          matricula?: string | null
          nacionalidade?: string | null
          naturalidade?: string | null
          nome_completo?: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          observacoes?: string | null
          raca?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          responsavel_telefone?: string | null
          rg?: string | null
          sexo?: string | null
          status?: Database["public"]["Enums"]["jovem_status"]
          telefone?: string | null
          turma_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jovens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jovens_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jovens_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_internas: {
        Row: {
          created_at: string
          created_by: string | null
          destinatario_role: Database["public"]["Enums"]["app_role"]
          id: string
          jovem_id: string | null
          lida: boolean
          mensagem: string
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destinatario_role: Database["public"]["Enums"]["app_role"]
          id?: string
          jovem_id?: string | null
          lida?: boolean
          mensagem: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destinatario_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          jovem_id?: string | null
          lida?: boolean
          mensagem?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_internas_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_group_items: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          permission_key_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          permission_key_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          permission_key_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_group_items_permission_key_id_fkey"
            columns: ["permission_key_id"]
            isOneToOne: false
            referencedRelation: "permission_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_groups: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          setor: string | null
          sistema: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          setor?: string | null
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          setor?: string | null
          sistema?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      permission_keys: {
        Row: {
          acao: string
          ativo: boolean
          chave: string
          created_at: string
          descricao: string | null
          id: string
          modulo: string
        }
        Insert: {
          acao: string
          ativo?: boolean
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          modulo: string
        }
        Update: {
          acao?: string
          ativo?: boolean
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          modulo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome_completo: string
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email: string
          id: string
          nome_completo: string
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string
          updated_at?: string
        }
        Relationships: []
      }
      projeto_anexos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mime_type: string | null
          nome_arquivo: string
          projeto_id: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          projeto_id: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          projeto_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_anexos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_orcamentos: {
        Row: {
          created_at: string
          created_by: string | null
          descritivo: string | null
          fornecedor: string
          id: string
          projeto_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descritivo?: string | null
          fornecedor: string
          id?: string
          projeto_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descritivo?: string | null
          fornecedor?: string
          id?: string
          projeto_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "projeto_orcamentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_participantes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          jovem_id: string | null
          papel: string | null
          participante_contato: string | null
          participante_nome: string | null
          projeto_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          jovem_id?: string | null
          papel?: string | null
          participante_contato?: string | null
          participante_nome?: string | null
          projeto_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          jovem_id?: string | null
          papel?: string | null
          participante_contato?: string | null
          participante_nome?: string | null
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_participantes_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_participantes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          nome: string
          setor: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome: string
          setor?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          setor?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_access_attempts: {
        Row: {
          attempts: number
          blocked_until: string | null
          created_at: string
          first_attempt_at: string
          id: string
          key_hash: string
          last_attempt_at: string
          scope: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          first_attempt_at?: string
          id?: string
          key_hash: string
          last_attempt_at?: string
          scope: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          first_attempt_at?: string
          id?: string
          key_hash?: string
          last_attempt_at?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes_setoriais: {
        Row: {
          agendamento_criado_em: string | null
          atendimento_agendado_id: string | null
          created_at: string
          descricao: string
          devolutiva: string | null
          id: string
          jovem_id: string
          prazo_resposta: string | null
          prioridade: string
          responded_at: string | null
          respondida_por: string | null
          setor_destino: string
          setor_origem: string
          solicitada_por: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          agendamento_criado_em?: string | null
          atendimento_agendado_id?: string | null
          created_at?: string
          descricao: string
          devolutiva?: string | null
          id?: string
          jovem_id: string
          prazo_resposta?: string | null
          prioridade?: string
          responded_at?: string | null
          respondida_por?: string | null
          setor_destino: string
          setor_origem: string
          solicitada_por?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          agendamento_criado_em?: string | null
          atendimento_agendado_id?: string | null
          created_at?: string
          descricao?: string
          devolutiva?: string | null
          id?: string
          jovem_id?: string
          prazo_resposta?: string | null
          prioridade?: string
          responded_at?: string | null
          respondida_por?: string | null
          setor_destino?: string
          setor_origem?: string
          solicitada_por?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_setoriais_atendimento_agendado_id_fkey"
            columns: ["atendimento_agendado_id"]
            isOneToOne: false
            referencedRelation: "atendimentos_agendados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_setoriais_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_setoriais_respondida_por_fkey"
            columns: ["respondida_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_setoriais_solicitada_por_fkey"
            columns: ["solicitada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_jovem: {
        Row: {
          atribuida_para: string | null
          created_at: string
          criada_por: string | null
          descricao: string | null
          due_date: string | null
          id: string
          jovem_id: string
          prioridade: string
          status: string
          titulo: string
        }
        Insert: {
          atribuida_para?: string | null
          created_at?: string
          criada_por?: string | null
          descricao?: string | null
          due_date?: string | null
          id?: string
          jovem_id: string
          prioridade?: string
          status?: string
          titulo: string
        }
        Update: {
          atribuida_para?: string | null
          created_at?: string
          criada_por?: string | null
          descricao?: string | null
          due_date?: string | null
          id?: string
          jovem_id?: string
          prioridade?: string
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_jovem_jovem_id_fkey"
            columns: ["jovem_id"]
            isOneToOne: false
            referencedRelation: "jovens"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          analista_responsavel_id: string | null
          ativo: boolean
          capacidade: number | null
          codigo: string
          created_at: string
          created_by: string | null
          curso_id: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          nome: string
          unidade_id: string | null
        }
        Insert: {
          analista_responsavel_id?: string | null
          ativo?: boolean
          capacidade?: number | null
          codigo: string
          created_at?: string
          created_by?: string | null
          curso_id?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome: string
          unidade_id?: string | null
        }
        Update: {
          analista_responsavel_id?: string | null
          ativo?: boolean
          capacidade?: number | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          curso_id?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_analista_responsavel_id_fkey"
            columns: ["analista_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          created_at: string
          created_by: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      user_permission_groups: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_inscricao_completion: {
        Args: {
          inscricao: Database["public"]["Tables"]["inscricoes_jovens_aprendizes"]["Row"]
        }
        Returns: number
      }
      change_inscricao_status: {
        Args: {
          p_inscricao_id: string
          p_motivo?: string
          p_new_status: string
          p_observacao?: string
          p_origem?: string
        }
        Returns: {
          acompanhamento_medico: boolean | null
          aprovado_por: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          completed_at: string | null
          composicao_familiar: Json | null
          contato_1: string | null
          contato_2: string | null
          contatos_mensagem: Json | null
          cpf: string
          created_at: string
          current_step: number | null
          data_aprovacao: string | null
          data_contrato: string | null
          data_nascimento: string | null
          descricao_acompanhamento: string | null
          descricao_beneficio: string | null
          descricao_deficiencia: string | null
          descricao_doenca: string | null
          descricao_pcd: string | null
          descricao_programa: string | null
          e_estrangeiro: boolean | null
          e_pcd: boolean | null
          edit_token: string | null
          email: string
          empresa_id: string | null
          esta_estudando: boolean | null
          estado: string | null
          habilidades_computador: string | null
          id: string
          jovem_id: string | null
          laudo_medico_url: string | null
          logradouro: string | null
          nivel_educacao: string | null
          nivel_pcd: string | null
          nome_completo: string | null
          nome_social: string | null
          notas_internas: string | null
          numero: string | null
          numero_ctps: string | null
          observacoes: string | null
          pais_origem: string | null
          participa_programa_social: boolean | null
          periodo_estudo: string | null
          pis_pasep: string | null
          possui_deficiencia: boolean | null
          possui_doenca_cronica: boolean | null
          possui_energia: boolean | null
          possui_saneamento: boolean | null
          quantidade_membros: number | null
          raca: string | null
          recebe_beneficio: boolean | null
          regiao_metropolitana: boolean | null
          renda_familiar: number | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_parentesco: string | null
          responsavel_telefone: string | null
          rg: string | null
          sexo: string | null
          situacao_moradia: string | null
          status: string
          step1_completed_at: string | null
          step2_completed_at: string | null
          step3_completed_at: string | null
          tamanho_calcado: string | null
          tamanho_uniforme: string | null
          tem_ctps_digital: boolean | null
          tem_nome_social: boolean | null
          tipo_moradia: string | null
          token_expires_at: string | null
          turma_id: string | null
          unidade_preferencia: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "inscricoes_jovens_aprendizes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_cpf_exists: { Args: { _cpf: string }; Returns: boolean }
      check_cpf_inscricao_exists: { Args: { _cpf: string }; Returns: boolean }
      create_internal_notification:
        | {
            Args: {
              p_jovem_id: string
              p_mensagem: string
              p_related_id: string
              p_related_type: string
              p_role: Database["public"]["Enums"]["app_role"]
            }
            Returns: string
          }
        | {
            Args: {
              p_created_by?: string
              p_jovem_id: string
              p_mensagem: string
              p_related_id: string
              p_related_type: string
              p_role: Database["public"]["Enums"]["app_role"]
            }
            Returns: string
          }
        | {
            Args: {
              p_entity_id?: string
              p_entity_type?: string
              p_jovem_id?: string
              p_message: string
              p_role: Database["public"]["Enums"]["app_role"]
            }
            Returns: string
          }
      generate_edit_token: { Args: never; Returns: string }
      get_jovem_pendencias: { Args: { p_jovem_id: string }; Returns: string[] }
      get_pendencias_por_jovens: {
        Args: { p_jovem_ids: string[] }
        Returns: {
          jovem_id: string
          pendencias: string[]
        }[]
      }
      get_timeline_prontuario: {
        Args: {
          p_jovem_id: string
          p_periodo_dias?: number
          p_tipo_evento?: string
        }
        Returns: {
          created_at: string
          created_by: string
          data_evento: string
          id: string
          responsavel_id: string
          resumo: string
          status_jovem: string
          tipo_evento: string
          titulo: string
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_permission: { Args: { p_key: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
      legacy_role_permissions: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: string[]
      }
      list_my_permissions: {
        Args: never
        Returns: {
          permission_key: string
        }[]
      }
      log_audit: {
        Args: {
          p_action_type: Database["public"]["Enums"]["audit_action_type"]
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_data?: Json
          p_old_data?: Json
        }
        Returns: string
      }
      map_setor_to_role: {
        Args: { p_setor: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      migrate_inscricao_to_jovem: {
        Args: {
          empresa_id_param?: string
          inscricao_id: string
          turma_id_param?: string
        }
        Returns: string
      }
      notify_roles_for_user: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_jovem_id: string
          p_message: string
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_pendencia_notifications_for_jovem: {
        Args: { p_jovem_id: string }
        Returns: undefined
      }
      send_tarefa_notification: {
        Args: {
          p_jovem_id: string
          p_mensagem: string
          p_tarefa_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      sync_certificacoes_status_by_validade: { Args: never; Returns: number }
      validate_inscricao_status_transition: {
        Args: { p_current_status: string; p_new_status: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "analista_pedagogico"
        | "analista_social"
        | "analista_psicossocial"
        | "gestor"
      audit_action_type: "create" | "update" | "delete" | "status_change"
      jovem_status:
        | "ativo"
        | "inativo"
        | "desligado"
        | "formado"
        | "draft"
        | "completed"
        | "under_analysis"
        | "pending_documents"
        | "approved"
        | "rejected"
        | "active_apprentice"
        | "inactive"
        | "terminated"
        | "completed_program"
      tipo_atendimento:
        | "intervencao"
        | "avaliacao_pedagogica"
        | "avaliacao_socioeconomica"
        | "encaminhamento"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "analista_pedagogico",
        "analista_social",
        "analista_psicossocial",
        "gestor",
      ],
      audit_action_type: ["create", "update", "delete", "status_change"],
      jovem_status: [
        "ativo",
        "inativo",
        "desligado",
        "formado",
        "draft",
        "completed",
        "under_analysis",
        "pending_documents",
        "approved",
        "rejected",
        "active_apprentice",
        "inactive",
        "terminated",
        "completed_program",
      ],
      tipo_atendimento: [
        "intervencao",
        "avaliacao_pedagogica",
        "avaliacao_socioeconomica",
        "encaminhamento",
      ],
    },
  },
} as const
