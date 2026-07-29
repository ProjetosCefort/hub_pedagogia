import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  JovemReport,
  JovemReportOptions,
  JovemPersonalData,
  JovemSocioeconomicData,
  IntervencaoData,
  AvaliacaoPedagogicaData,
  EncaminhamentoData,
  StatusHistoryData,
  TimelineEventData,
  PedagogicalHistoryData,
} from "@/types/jovem-report";

/**
 * Hook para gerar relatório estruturado do Registro do Jovem
 */
export function useJovemReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Busca dados pessoais do jovem com relacionamentos
   */
  const fetchPersonalData = useCallback(
    async (jovemId: string): Promise<JovemPersonalData | null> => {
      const { data: jovem, error: jovemError } = await supabase
        .from("jovens")
        .select(
          `
        *,
        empresa:empresas(id, razao_social, nome_fantasia, cnpj),
        turma:turmas(id, nome, codigo, data_inicio, data_fim),
        unidade:unidades(id, nome, endereco, telefone)
      `,
        )
        .eq("id", jovemId)
        .maybeSingle();

      if (jovemError) throw jovemError;
      if (!jovem) return null;

      // Buscar dados do criador
      let createdBy = null;
      if (jovem.created_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, nome_completo, cargo")
          .eq("id", jovem.created_by)
          .maybeSingle();

        if (profile) {
          createdBy = {
            id: profile.id,
            nome_completo: profile.nome_completo,
            cargo: profile.cargo,
          };
        }
      }

      return {
        id: jovem.id,
        nome_completo: jovem.nome_completo,
        data_nascimento: jovem.data_nascimento,
        cpf: jovem.cpf,
        rg: jovem.rg,
        sexo: jovem.sexo,
        raca: jovem.raca,
        estado_civil: jovem.estado_civil,
        nacionalidade: jovem.nacionalidade,
        naturalidade: jovem.naturalidade,
        email: jovem.email,
        telefone: jovem.telefone,
        celular: jovem.celular,
        cep: jovem.cep,
        logradouro: jovem.logradouro,
        numero: jovem.numero,
        complemento: jovem.complemento,
        bairro: jovem.bairro,
        cidade: jovem.cidade,
        estado: jovem.estado,
        nome_mae: jovem.nome_mae,
        nome_pai: jovem.nome_pai,
        responsavel_nome: jovem.responsavel_nome,
        responsavel_telefone: jovem.responsavel_telefone,
        responsavel_parentesco: jovem.responsavel_parentesco,
        matricula: jovem.matricula,
        data_admissao: jovem.data_admissao,
        data_desligamento: jovem.data_desligamento,
        status: jovem.status,
        foto_url: jovem.foto_url,
        empresa: jovem.empresa
          ? {
              id: jovem.empresa.id,
              razao_social: jovem.empresa.razao_social,
              nome_fantasia: jovem.empresa.nome_fantasia,
              cnpj: jovem.empresa.cnpj,
            }
          : null,
        turma: jovem.turma
          ? {
              id: jovem.turma.id,
              nome: jovem.turma.nome,
              codigo: jovem.turma.codigo,
              data_inicio: jovem.turma.data_inicio,
              data_fim: jovem.turma.data_fim,
            }
          : null,
        unidade: jovem.unidade
          ? {
              id: jovem.unidade.id,
              nome: jovem.unidade.nome,
              endereco: jovem.unidade.endereco,
              telefone: jovem.unidade.telefone,
            }
          : null,
        observacoes: jovem.observacoes,
        created_at: jovem.created_at,
        updated_at: jovem.updated_at,
        created_by: createdBy,
      };
    },
    [],
  );

  /**
   * Busca dados socioeconômicos
   */
  const fetchSocioeconomicData = useCallback(
    async (
      jovemId: string,
      options: JovemReportOptions = {},
    ): Promise<JovemSocioeconomicData> => {
      let query = supabase
        .from("avaliacoes_socioeconomicas")
        .select("*")
        .eq("jovem_id", jovemId)
        .order("data_avaliacao", { ascending: false });

      if (options.date_from) {
        query = query.gte("data_avaliacao", options.date_from);
      }
      if (options.date_to) {
        query = query.lte("data_avaliacao", options.date_to);
      }

      const { data: avaliacoes, error: avaliacoesError } = await query;

      if (avaliacoesError) throw avaliacoesError;

      const avaliacoesList = avaliacoes || [];
      const ultimaAvaliacao = avaliacoesList[0] || null;

      // Buscar registros sociais da última avaliação
      let registrosSociais: Array<{
        id: string;
        nome: string;
        sigla: string | null;
        descricao: string | null;
      }> = [];
      if (ultimaAvaliacao) {
        const { data: registros } = await supabase
          .from("avaliacoes_socioeconomicas_registros_sociais")
          .select(
            `
          registro_social_id,
          registros_sociais:config_registros_sociais(id, nome, sigla, descricao)
        `,
          )
          .eq("avaliacao_socioeconomica_id", ultimaAvaliacao.id);

        if (registros) {
          registrosSociais = registros
            .map((r: any) => r.registros_sociais)
            .filter(Boolean)
            .map((rs: any) => ({
              id: rs.id,
              nome: rs.nome,
              sigla: rs.sigla,
              descricao: rs.descricao,
            }));
        }
      }

      // Buscar responsável da última avaliação
      let responsavel = null;
      if (ultimaAvaliacao?.responsavel_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, nome_completo, cargo")
          .eq("id", ultimaAvaliacao.responsavel_id)
          .maybeSingle();

        if (profile) {
          responsavel = {
            id: profile.id,
            nome_completo: profile.nome_completo,
            cargo: profile.cargo,
          };
        }
      }

      // Buscar histórico completo de registros sociais para todas as avaliações
      const historicoAvaliacoes = await Promise.all(
        avaliacoesList.map(async (avaliacao) => {
          const { data: registros } = await supabase
            .from("avaliacoes_socioeconomicas_registros_sociais")
            .select(
              `
            registros_sociais:config_registros_sociais(nome, sigla)
          `,
            )
            .eq("avaliacao_socioeconomica_id", avaliacao.id);

          return {
            id: avaliacao.id,
            data_avaliacao: avaliacao.data_avaliacao,
            renda_familiar: avaliacao.renda_familiar,
            quantidade_membros: avaliacao.quantidade_membros,
            pcd_status: avaliacao.pcd_status,
            cadunico_status: avaliacao.cadunico_status,
            registros_sociais: (registros || [])
              .map((r: any) => r.registros_sociais)
              .filter(Boolean)
              .map((rs: any) => ({
                nome: rs.nome,
                sigla: rs.sigla,
              })),
            created_at: avaliacao.created_at,
          };
        }),
      );

      return {
        ultima_avaliacao: ultimaAvaliacao
          ? {
              id: ultimaAvaliacao.id,
              data_avaliacao: ultimaAvaliacao.data_avaliacao,
              pcd_status: ultimaAvaliacao.pcd_status,
              tipo_deficiencia: ultimaAvaliacao.tipo_deficiencia,
              problemas_saude: ultimaAvaliacao.problemas_saude,
              composicao_familiar: ultimaAvaliacao.composicao_familiar,
              renda_familiar: ultimaAvaliacao.renda_familiar,
              quantidade_membros: ultimaAvaliacao.quantidade_membros,
              moradia_tipo: ultimaAvaliacao.moradia_tipo,
              situacao_moradia: ultimaAvaliacao.situacao_moradia,
              possui_saneamento: ultimaAvaliacao.possui_saneamento,
              possui_energia: ultimaAvaliacao.possui_energia,
              nis: ultimaAvaliacao.nis,
              cadunico_status: ultimaAvaliacao.cadunico_status,
              cras: ultimaAvaliacao.cras,
              creas: ultimaAvaliacao.creas,
              beneficios_sociais: ultimaAvaliacao.beneficios_sociais,
              registros_sociais: registrosSociais,
              observacoes: ultimaAvaliacao.observacoes,
              responsavel,
              created_at: ultimaAvaliacao.created_at,
            }
          : null,
        historico_avaliacoes: historicoAvaliacoes,
      };
    },
    [],
  );

  /**
   * Busca intervenções
   */
  const fetchIntervencoes = useCallback(
    async (
      jovemId: string,
      options: JovemReportOptions = {},
    ): Promise<IntervencaoData[]> => {
      if (options.include_intervencoes === false) return [];

      let query = supabase
        .from("intervencoes")
        .select("*")
        .eq("jovem_id", jovemId)
        .eq("tipo", "intervencao")
        .order("data_atendimento", { ascending: false });

      if (options.date_from) {
        query = query.gte("data_atendimento", options.date_from);
      }
      if (options.date_to) {
        query = query.lte("data_atendimento", options.date_to);
      }

      const { data: intervencoes, error: intervencoesError } = await query;

      if (intervencoesError) throw intervencoesError;

      // Buscar motivos e responsáveis
      const intervencoesEnriquecidas = await Promise.all(
        (intervencoes || []).map(async (intervencao: any) => {
          // Buscar motivo se houver FK
          let motivoNome = null;
          if ((intervencao as any).motivo_intervencao_id) {
            const { data: motivo } = await supabase
              .from("config_motivos_intervencao")
              .select("nome")
              .eq("id", (intervencao as any).motivo_intervencao_id)
              .maybeSingle();

            motivoNome = motivo?.nome || null;
          }

          // Buscar responsável
          let responsavel = null;
          const responsavelId =
            intervencao.responsavel_id || intervencao.created_by;
          if (responsavelId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, nome_completo, cargo")
              .eq("id", responsavelId)
              .maybeSingle();

            if (profile) {
              responsavel = {
                id: profile.id,
                nome_completo: profile.nome_completo,
                cargo: profile.cargo,
              };
            }
          }

          return {
            id: intervencao.id,
            data_atendimento: intervencao.data_atendimento,
            tipo: intervencao.tipo,
            descricao_demanda: intervencao.descricao_demanda,
            relato_jovem: intervencao.relato_jovem,
            percepcao_profissional: intervencao.percepcao_profissional,
            plano_acao: intervencao.plano_acao,
            conclusao: intervencao.conclusao,
            motivo_intervencao: intervencao.motivo_intervencao || null,
            motivo_intervencao_id:
              (intervencao as any).motivo_intervencao_id || null,
            motivo_intervencao_nome: motivoNome,
            responsavel,
            created_at: intervencao.created_at,
            updated_at: intervencao.updated_at,
          };
        }),
      );

      return intervencoesEnriquecidas;
    },
    [],
  );

  /**
   * Busca avaliações pedagógicas
   */
  const fetchAvaliacoesPedagogicas = useCallback(
    async (
      jovemId: string,
      options: JovemReportOptions = {},
    ): Promise<AvaliacaoPedagogicaData[]> => {
      if (options.include_avaliacoes_pedagogicas === false) return [];

      let query = supabase
        .from("avaliacoes_pedagogicas")
        .select("*")
        .eq("jovem_id", jovemId)
        .order("data_avaliacao", { ascending: false });

      if (options.date_from) {
        query = query.gte("data_avaliacao", options.date_from);
      }
      if (options.date_to) {
        query = query.lte("data_avaliacao", options.date_to);
      }

      const { data: avaliacoes, error: avaliacoesError } = await query;

      if (avaliacoesError) throw avaliacoesError;

      // Enriquecer com motivos, aproveitamento escolar e responsáveis
      const avaliacoesEnriquecidas = await Promise.all(
        (avaliacoes || []).map(async (avaliacao: any) => {
          // Buscar motivo
          let motivoNome = null;
          if ((avaliacao as any).motivo_intervencao_id) {
            const { data: motivo } = await supabase
              .from("config_motivos_intervencao")
              .select("nome")
              .eq("id", (avaliacao as any).motivo_intervencao_id)
              .maybeSingle();

            motivoNome = motivo?.nome || null;
          }

          // Buscar aproveitamento escolar
          let aproveitamentoNome = null;
          if ((avaliacao as any).aproveitamento_escolar_id) {
            const { data: aproveitamento } = await supabase
              .from("config_aproveitamento_escolar")
              .select("nome")
              .eq("id", (avaliacao as any).aproveitamento_escolar_id)
              .maybeSingle();

            aproveitamentoNome = aproveitamento?.nome || null;
          }

          // Buscar responsável
          let responsavel = null;
          const responsavelId =
            avaliacao.responsavel_id || avaliacao.created_by;
          if (responsavelId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, nome_completo, cargo")
              .eq("id", responsavelId)
              .maybeSingle();

            if (profile) {
              responsavel = {
                id: profile.id,
                nome_completo: profile.nome_completo,
                cargo: profile.cargo,
              };
            }
          }

          return {
            id: avaliacao.id,
            data_avaliacao: avaliacao.data_avaliacao,
            motivo_intervencao: avaliacao.motivo_intervencao,
            motivo_intervencao_id:
              (avaliacao as any).motivo_intervencao_id || null,
            motivo_intervencao_nome: motivoNome,
            descricao_conducao: avaliacao.descricao_conducao,
            estrategias_aplicadas: avaliacao.estrategias_aplicadas,
            manifestacao_jovem: avaliacao.manifestacao_jovem,
            parecer_final: avaliacao.parecer_final,
            aproveitamento_escolar_id:
              (avaliacao as any).aproveitamento_escolar_id || null,
            aproveitamento_escolar_nome: aproveitamentoNome,
            assinatura_profissional: avaliacao.assinatura_profissional,
            assinatura_jovem: avaliacao.assinatura_jovem,
            responsavel,
            created_at: avaliacao.created_at,
            updated_at: avaliacao.updated_at,
          };
        }),
      );

      return avaliacoesEnriquecidas;
    },
    [],
  );

  /**
   * Busca encaminhamentos
   */
  const fetchEncaminhamentos = useCallback(
    async (
      jovemId: string,
      options: JovemReportOptions = {},
    ): Promise<EncaminhamentoData[]> => {
      if (options.include_encaminhamentos === false) return [];

      let query = supabase
        .from("encaminhamentos")
        .select("*")
        .eq("jovem_id", jovemId)
        .order("data_encaminhamento", { ascending: false });

      if (options.date_from) {
        query = query.gte("data_encaminhamento", options.date_from);
      }
      if (options.date_to) {
        query = query.lte("data_encaminhamento", options.date_to);
      }

      const { data: encaminhamentos, error: encaminhamentosError } =
        await query;

      if (encaminhamentosError) throw encaminhamentosError;

      // Enriquecer com modelo e responsável
      const encaminhamentosEnriquecidos = await Promise.all(
        (encaminhamentos || []).map(async (encaminhamento: any) => {
          // Buscar modelo
          let modeloNome = null;
          if ((encaminhamento as any).modelo_encaminhamento_id) {
            const { data: modelo } = await supabase
              .from("config_modelos_encaminhamento")
              .select("nome")
              .eq("id", (encaminhamento as any).modelo_encaminhamento_id)
              .maybeSingle();

            modeloNome = modelo?.nome || null;
          }

          // Buscar responsável
          let responsavel = null;
          const responsavelId =
            encaminhamento.responsavel_id || encaminhamento.created_by;
          if (responsavelId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, nome_completo, cargo")
              .eq("id", responsavelId)
              .maybeSingle();

            if (profile) {
              responsavel = {
                id: profile.id,
                nome_completo: profile.nome_completo,
                cargo: profile.cargo,
              };
            }
          }

          return {
            id: encaminhamento.id,
            data_encaminhamento: encaminhamento.data_encaminhamento,
            destino_nome: encaminhamento.destino_nome,
            destino_instituicao: encaminhamento.destino_instituicao,
            destino_cargo: encaminhamento.destino_cargo,
            destino_contato: encaminhamento.destino_contato,
            descricao_encaminhamento: encaminhamento.descricao_encaminhamento,
            retorno_previsto: encaminhamento.retorno_previsto,
            modelo_encaminhamento_id:
              (encaminhamento as any).modelo_encaminhamento_id || null,
            modelo_encaminhamento_nome: modeloNome,
            responsavel,
            created_at: encaminhamento.created_at,
          };
        }),
      );

      return encaminhamentosEnriquecidos;
    },
    [],
  );

  /**
   * Busca histórico de status
   */
  const fetchStatusHistory = useCallback(
    async (
      jovemId: string,
      options: JovemReportOptions = {},
    ): Promise<StatusHistoryData[]> => {
      if (options.include_status_history === false) return [];

      let history: any[] = [];

      const { data: inscricoesData } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("id")
        .eq("jovem_id", jovemId)
        .order("created_at", { ascending: false })
        .limit(1);

      const inscricaoId = inscricoesData?.[0]?.id;
      if (inscricaoId) {
        let inscricaoQuery = supabase
          .from("inscricoes_status_history")
          .select(
            "id, previous_status, new_status, motivo, observacao, changed_by, created_at",
          )
          .eq("inscricao_id", inscricaoId)
          .order("created_at", { ascending: false });

        if (options.date_from) {
          inscricaoQuery = inscricaoQuery.gte("created_at", options.date_from);
        }
        if (options.date_to) {
          inscricaoQuery = inscricaoQuery.lte("created_at", options.date_to);
        }

        const { data: inscricaoHistory, error: inscricaoHistoryError } =
          await inscricaoQuery;
        if (!inscricaoHistoryError && inscricaoHistory) {
          history = inscricaoHistory.map((item: any) => ({
            id: item.id,
            previous_status: item.previous_status,
            new_status: item.new_status,
            changed_at: item.created_at,
            reason: item.motivo || item.observacao || null,
            changed_by: item.changed_by,
          }));
        }
      }

      // Enriquecer com dados do responsável
      const historyEnriquecido = await Promise.all(
        (history || []).map(async (item) => {
          const { data: profile } = item.changed_by
            ? await supabase
                .from("profiles")
                .select("id, nome_completo, cargo")
                .eq("id", item.changed_by)
                .maybeSingle()
            : { data: null };

          return {
            id: item.id,
            previous_status: item.previous_status as any,
            new_status: item.new_status as any,
            changed_at: item.changed_at,
            reason: item.reason,
            changed_by: profile
              ? {
                  id: profile.id,
                  nome_completo: profile.nome_completo,
                  cargo: profile.cargo,
                }
              : {
                  id: item.changed_by || "sistema",
                  nome_completo: "Sistema",
                  cargo: null,
                },
          };
        }),
      );

      return historyEnriquecido;
    },
    [],
  );

  const fetchAttendanceHistory = useCallback(async (jovemId: string) => {
    const { data, error } = await supabase
      .from("frequencia_jovem" as any)
      .select("id, data_registro, status, observacoes, responsavel_id")
      .eq("jovem_id", jovemId)
      .order("data_registro", { ascending: false });

    if (error) throw error;

    const rows = (data || []) as Array<{
      id: string;
      data_registro: string;
      status: string;
      observacoes: string | null;
      responsavel_id: string | null;
    }>;

    const ids = Array.from(new Set(rows.map((row) => row.responsavel_id).filter(Boolean) as string[]));
    const profilesMap = new Map<string, string>();

    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", ids);

      profiles?.forEach((profile) => {
        profilesMap.set(profile.id, profile.nome_completo || "Usuário");
      });
    }

    return {
      available: true,
      message:
        rows.length > 0
          ? `${rows.length} registro(s) de frequência encontrado(s).`
          : "Nenhum registro de frequência encontrado para este jovem.",
      records: rows.map((row) => ({
        data: row.data_registro,
        status: row.status,
        observacoes: row.observacoes,
        responsavel: row.responsavel_id ? profilesMap.get(row.responsavel_id) || null : null,
      })),
    };
  }, []);

  const fetchTimeline = useCallback(
    async (
      jovemId: string,
      options: JovemReportOptions = {},
    ): Promise<TimelineEventData[]> => {
      if (options.include_timeline === false) return [];

      const { data, error } = await supabase.rpc("get_timeline_prontuario", {
        p_jovem_id: jovemId,
        p_tipo_evento: null,
        p_periodo_dias: null,
      });

      if (error) throw error;

      const rows = (data || []) as Array<{
        id: string;
        tipo_evento: TimelineEventData["tipo_evento"];
        data_evento: string;
        created_at: string;
        titulo: string;
        resumo: string;
        responsavel_id: string | null;
        created_by: string | null;
        status_jovem: string | null;
      }>;

      const userIds = Array.from(
        new Set(
          rows.flatMap((item) =>
            [item.responsavel_id, item.created_by].filter(Boolean) as string[],
          ),
        ),
      );

      const profilesMap = new Map<
        string,
        { id: string; nome_completo: string; cargo: string | null }
      >();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo, cargo")
          .in("id", userIds);

        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, {
            id: profile.id,
            nome_completo: profile.nome_completo,
            cargo: profile.cargo,
          });
        });
      }

      return rows.map((item) => ({
        id: item.id,
        tipo_evento: item.tipo_evento,
        data_evento: item.data_evento,
        created_at: item.created_at,
        titulo: item.titulo,
        resumo: item.resumo,
        responsavel:
          (item.responsavel_id && profilesMap.get(item.responsavel_id)) ||
          (item.created_by && profilesMap.get(item.created_by)) ||
          null,
        status_jovem: item.status_jovem,
      }));
    },
    [],
  );

  const fetchPedagogicalHistory = useCallback(
    async (
      jovemId: string,
      avaliacoesPedagogicas: AvaliacaoPedagogicaData[],
      options: JovemReportOptions = {},
    ): Promise<PedagogicalHistoryData> => {
      if (options.include_pedagogical_history === false) {
        return { avaliacoes: [], conselhos_classe: [] };
      }

      const { data: conselhoRegistros, error } = await supabase
        .from("conselho_classe_registros")
        .select(
          `
            id,
            descricao,
            dificuldades,
            plano_acao,
            conselho:conselho_classe(
              id,
              data_reuniao,
              periodo,
              parecer,
              turma:turmas(nome)
            )
          `,
        )
        .eq("jovem_id", jovemId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return {
        avaliacoes: avaliacoesPedagogicas.map((item) => ({
          id: item.id,
          data: item.data_avaliacao,
          motivo: item.motivo_intervencao_nome || item.motivo_intervencao,
          aproveitamento: item.aproveitamento_escolar_nome,
          parecer_final: item.parecer_final,
          dificuldades: [],
          plano_acao: item.estrategias_aplicadas,
          responsavel: item.responsavel?.nome_completo || null,
        })),
        conselhos_classe: ((conselhoRegistros || []) as any[]).map((item) => ({
          id: item.id,
          data_reuniao: item.conselho?.data_reuniao,
          periodo: item.conselho?.periodo || null,
          turma: item.conselho?.turma?.nome || null,
          descricao: item.descricao || null,
          dificuldades: item.dificuldades || [],
          plano_acao: item.plano_acao || null,
          parecer_turma: item.conselho?.parecer || null,
        })),
      };
    },
    [],
  );

  /**
   * Gera relatório completo do jovem
   */
  const generateReport = useCallback(
    async (
      jovemId: string,
      options: JovemReportOptions = {},
    ): Promise<JovemReport> => {
      setLoading(true);
      setError(null);

      try {
        // Buscar dados do usuário atual
        let generatedBy = null;
        if (user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, nome_completo, cargo")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            generatedBy = {
              id: profile.id,
              nome_completo: profile.nome_completo,
              cargo: profile.cargo,
            };
          }
        }

        // Buscar todos os dados em paralelo
        const [
          personalData,
          socioeconomicData,
          intervencoes,
          avaliacoesPedagogicas,
          encaminhamentos,
          statusHistory,
          timeline,
          attendanceHistory,
        ] = await Promise.all([
          fetchPersonalData(jovemId),
          fetchSocioeconomicData(jovemId, options),
          fetchIntervencoes(jovemId, options),
          fetchAvaliacoesPedagogicas(jovemId, options),
          fetchEncaminhamentos(jovemId, options),
          fetchStatusHistory(jovemId, options),
          fetchTimeline(jovemId, options),
          fetchAttendanceHistory(jovemId),
        ]);

        const pedagogicalHistory = await fetchPedagogicalHistory(
          jovemId,
          avaliacoesPedagogicas,
          options,
        );

        if (!personalData) {
          throw new Error("Jovem não encontrado");
        }

        // Calcular estatísticas
        const todasIntervencoes = [...intervencoes, ...avaliacoesPedagogicas];
        const getIntervencaoDate = (
          item: IntervencaoData | AvaliacaoPedagogicaData,
        ) =>
          "data_atendimento" in item
            ? item.data_atendimento
            : item.data_avaliacao;
        const primeiraIntervencao =
          todasIntervencoes.length > 0
            ? getIntervencaoDate(todasIntervencoes[todasIntervencoes.length - 1]) || null
            : null;
        const ultimaIntervencao =
          todasIntervencoes.length > 0
            ? getIntervencaoDate(todasIntervencoes[0]) || null
            : null;

        // Calcular dias ativo
        let diasAtivo = null;
        if (personalData.data_admissao) {
          const dataAdmissao = new Date(personalData.data_admissao);
          const dataFim = personalData.data_desligamento
            ? new Date(personalData.data_desligamento)
            : new Date();
          const diffTime = Math.abs(dataFim.getTime() - dataAdmissao.getTime());
          diasAtivo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const report: JovemReport = {
          metadata: {
            generated_at: new Date().toISOString(),
            generated_by: generatedBy,
            report_version: "1.0.0",
            jovem_id: jovemId,
          },
          personal_data: personalData,
          socioeconomic_data: socioeconomicData,
          intervencoes,
          avaliacoes_pedagogicas: avaliacoesPedagogicas,
          encaminhamentos,
          status_history: statusHistory,
          timeline,
          pedagogical_history: pedagogicalHistory,
          attendance_history: attendanceHistory,
          statistics: {
            total_intervencoes: intervencoes.length,
            total_avaliacoes_pedagogicas: avaliacoesPedagogicas.length,
            total_avaliacoes_socioeconomicas:
              socioeconomicData.historico_avaliacoes.length,
            total_encaminhamentos: encaminhamentos.length,
            dias_ativo: diasAtivo,
            primeira_intervencao: primeiraIntervencao,
            ultima_intervencao: ultimaIntervencao,
          },
        };

        return report;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Erro ao gerar relatório");
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      fetchPersonalData,
      fetchSocioeconomicData,
      fetchIntervencoes,
      fetchAvaliacoesPedagogicas,
      fetchEncaminhamentos,
      fetchStatusHistory,
      fetchTimeline,
      fetchPedagogicalHistory,
      fetchAttendanceHistory,
    ],
  );

  return {
    generateReport,
    loading,
    error,
  };
}
