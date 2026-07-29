/**
 * Utilitários para formatação e exportação de relatórios do Registro do Jovem
 */

import { JovemReport } from "@/types/jovem-report";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata data para exibição em relatórios
 */
export function formatReportDate(
  dateString: string | null | undefined,
): string {
  if (!dateString) return "—";

  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
}

/**
 * Formata data e hora para exibição em relatórios
 */
export function formatReportDateTime(
  dateString: string | null | undefined,
): string {
  if (!dateString) return "—";

  try {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  } catch {
    return dateString;
  }
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCodeLabel(
  value: string | null | undefined,
  dictionary: Record<string, string> = {},
): string {
  if (!value) return "—";
  const normalized = value.toLowerCase();
  if (dictionary[normalized]) {
    return dictionary[normalized];
  }
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/**
 * Formata endereço completo
 */
export function formatAddress(jovem: JovemReport["personal_data"]): string {
  const parts: string[] = [];

  if (jovem.logradouro) {
    parts.push(jovem.logradouro);
    if (jovem.numero) parts.push(jovem.numero);
    if (jovem.complemento) parts.push(jovem.complemento);
  }

  if (jovem.bairro) parts.push(jovem.bairro);

  if (jovem.cidade || jovem.estado) {
    const cidadeEstado = [jovem.cidade, jovem.estado]
      .filter(Boolean)
      .join(" - ");
    parts.push(cidadeEstado);
  }

  if (jovem.cep) parts.push(`CEP: ${jovem.cep}`);

  return parts.length > 0 ? parts.join(", ") : "—";
}

/**
 * Formata CPF para exibição
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";

  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, "");

  // Aplica máscara
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  return cpf;
}

/**
 * Formata telefone para exibição
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";

  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, "");

  // Aplica máscara
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  } else if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  return phone;
}

/**
 * Formata status do jovem para exibição
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: "Rascunho",
    completed: "Completo",
    under_analysis: "Em análise",
    pending_documents: "Documentos pendentes",
    approved: "Aprovado",
    rejected: "Rejeitado",
    active_apprentice: "Aprendiz ativo",
    inactive: "Inativo",
    terminated: "Desligado",
    completed_program: "Programa concluído",
  };

  return statusMap[status] || status;
}

/**
 * Calcula idade a partir da data de nascimento
 */
export function calculateAge(
  birthDate: string | null | undefined,
): number | null {
  if (!birthDate) return null;

  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  } catch {
    return null;
  }
}

/**
 * Exporta relatório para JSON
 */
export function exportReportToJSON(report: JovemReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Exporta relatório para JSON com nome de arquivo sugerido
 */
export function downloadReportAsJSON(report: JovemReport): void {
  const json = exportReportToJSON(report);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const nomeArquivo = `relatorio-jovem-${report.personal_data.nome_completo
    .toLowerCase()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")}-${format(new Date(), "yyyy-MM-dd")}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Prepara dados do relatório para exportação em formato estruturado (pronto para PDF)
 */
export function prepareReportForPDF(report: JovemReport): {
  metadata: {
    titulo: string;
    subtitulo: string;
    dataGeracao: string;
    geradoPor: string;
  };
  dadosPessoais: {
    identificacao: Record<string, string>;
    contato: Record<string, string>;
    endereco: string;
    dadosFamiliares: Record<string, string>;
    dadosInstitucionais: Record<string, string>;
  };
  dadosSocioeconomicos: {
    ultimaAvaliacao: Record<string, any> | null;
    historico: Array<Record<string, any>>;
  };
  intervencoes: Array<Record<string, any>>;
  avaliacoesPedagogicas: Array<Record<string, any>>;
  encaminhamentos: Array<Record<string, any>>;
  historicoStatus: Array<Record<string, any>>;
  timeline: Array<Record<string, any>>;
  evolucao: Record<string, any>;
  historicoPedagogico: {
    avaliacoes: Array<Record<string, any>>;
    conselhosClasse: Array<Record<string, any>>;
  };
  historicoFaltas: Record<string, any>;
  estatisticas: Record<string, any>;
} {
  const {
    personal_data,
    socioeconomic_data,
    intervencoes,
    avaliacoes_pedagogicas,
    encaminhamentos,
    status_history,
    timeline,
    pedagogical_history,
    attendance_history,
    statistics,
    metadata,
  } = report;

  // Buscar dados do gerador
  const geradoPor = metadata.generated_by
    ? `${metadata.generated_by.nome_completo}${metadata.generated_by.cargo ? ` - ${metadata.generated_by.cargo}` : ""}`
    : "Sistema";

  return {
    metadata: {
      titulo: `Relatório do Registro do Jovem - ${personal_data.nome_completo}`,
      subtitulo: `Matrícula: ${personal_data.matricula || "N/A"} | Status: ${formatStatus(personal_data.status)}`,
      dataGeracao: formatReportDateTime(metadata.generated_at),
      geradoPor,
    },
    dadosPessoais: {
      identificacao: {
        "Nome completo": personal_data.nome_completo,
        "Data de nascimento": formatReportDate(personal_data.data_nascimento),
        Idade: calculateAge(personal_data.data_nascimento)?.toString() || "—",
        CPF: formatCPF(personal_data.cpf),
        RG: personal_data.rg || "—",
        Sexo: personal_data.sexo || "—",
        "Estado civil": personal_data.estado_civil || "—",
        Nacionalidade: personal_data.nacionalidade || "—",
        Naturalidade: personal_data.naturalidade || "—",
      },
      contato: {
        "E-mail": personal_data.email || "—",
        Telefone: formatPhone(personal_data.telefone),
        Celular: formatPhone(personal_data.celular),
      },
      endereco: formatAddress(personal_data),
      dadosFamiliares: {
        "Nome da mãe": personal_data.nome_mae || "—",
        "Nome do pai": personal_data.nome_pai || "—",
        Responsável: personal_data.responsavel_nome || "—",
        "Telefone do responsável": formatPhone(
          personal_data.responsavel_telefone,
        ),
        Parentesco: personal_data.responsavel_parentesco || "—",
      },
      dadosInstitucionais: {
        Matrícula: personal_data.matricula || "—",
        "Data de admissão": formatReportDate(personal_data.data_admissao),
        "Data de desligamento": formatReportDate(
          personal_data.data_desligamento,
        ),
        Status: formatStatus(personal_data.status),
        Empresa:
          personal_data.empresa?.nome_fantasia ||
          personal_data.empresa?.razao_social ||
          "—",
        Turma: personal_data.turma?.nome || "—",
        "Código da turma": personal_data.turma?.codigo || "—",
        Unidade: personal_data.unidade?.nome || "—",
      },
    },
    dadosSocioeconomicos: {
      ultimaAvaliacao: socioeconomic_data.ultima_avaliacao
        ? {
            "Data da avaliação": formatReportDate(
              socioeconomic_data.ultima_avaliacao.data_avaliacao,
            ),
            "Situação PCD": formatCodeLabel(
              socioeconomic_data.ultima_avaliacao.pcd_status,
              {
                pcd: "PCD",
                nao_pcd: "Não PCD",
                em_analise: "Em análise",
              },
            ),
            "Tipo de deficiência":
              socioeconomic_data.ultima_avaliacao.tipo_deficiencia || "—",
            "Problemas de saúde":
              socioeconomic_data.ultima_avaliacao.problemas_saude || "—",
            "Renda familiar": formatCurrency(
              socioeconomic_data.ultima_avaliacao.renda_familiar,
            ),
            "Quantidade de membros":
              socioeconomic_data.ultima_avaliacao.quantidade_membros?.toString() ||
              "—",
            "Tipo de moradia":
              socioeconomic_data.ultima_avaliacao.moradia_tipo || "—",
            "Situação da moradia":
              socioeconomic_data.ultima_avaliacao.situacao_moradia || "—",
            "Possui saneamento": socioeconomic_data.ultima_avaliacao
              .possui_saneamento
              ? "Sim"
              : "Não",
            "Possui energia": socioeconomic_data.ultima_avaliacao.possui_energia
              ? "Sim"
              : "Não",
            NIS: socioeconomic_data.ultima_avaliacao.nis || "—",
            "Cadastro Único": formatCodeLabel(
              socioeconomic_data.ultima_avaliacao.cadunico_status,
              {
                atualizado: "Atualizado",
                desatualizado: "Desatualizado",
                nao_inscrito: "Não inscrito",
                pendente: "Pendente",
              },
            ),
            "CRAS de referência":
              socioeconomic_data.ultima_avaliacao.cras || "—",
            "CREAS de referência":
              socioeconomic_data.ultima_avaliacao.creas || "—",
            "Benefícios sociais":
              socioeconomic_data.ultima_avaliacao.beneficios_sociais || "—",
            "Registros sociais":
              socioeconomic_data.ultima_avaliacao.registros_sociais
                .map((rs) => (rs.sigla ? `${rs.sigla} - ${rs.nome}` : rs.nome))
                .join(", ") || "—",
            Observações: socioeconomic_data.ultima_avaliacao.observacoes || "—",
            Responsável: socioeconomic_data.ultima_avaliacao.responsavel
              ? `${socioeconomic_data.ultima_avaliacao.responsavel.nome_completo}${socioeconomic_data.ultima_avaliacao.responsavel.cargo ? ` - ${socioeconomic_data.ultima_avaliacao.responsavel.cargo}` : ""}`
              : "—",
          }
        : null,
      historico: socioeconomic_data.historico_avaliacoes.map((av) => ({
        Data: formatReportDate(av.data_avaliacao),
        "Renda familiar": formatCurrency(av.renda_familiar),
        Membros: av.quantidade_membros?.toString() || "—",
        "Situação PCD": formatCodeLabel(av.pcd_status, {
          pcd: "PCD",
          nao_pcd: "Não PCD",
          em_analise: "Em análise",
        }),
        "Cadastro Único": formatCodeLabel(av.cadunico_status, {
          atualizado: "Atualizado",
          desatualizado: "Desatualizado",
          nao_inscrito: "Não inscrito",
          pendente: "Pendente",
        }),
        "Registros sociais":
          av.registros_sociais
            .map((rs) => (rs.sigla ? `${rs.sigla} - ${rs.nome}` : rs.nome))
            .join(", ") || "—",
      })),
    },
    intervencoes: intervencoes.map((interv) => ({
      Data: formatReportDate(interv.data_atendimento),
      Motivo:
        interv.motivo_intervencao_nome || interv.motivo_intervencao || "—",
      "Descrição da demanda": interv.descricao_demanda,
      "Relato do jovem": interv.relato_jovem || "—",
      "Percepção profissional": interv.percepcao_profissional || "—",
      "Plano de ação": interv.plano_acao || "—",
      Conclusão: interv.conclusao || "—",
      Responsável: interv.responsavel
        ? `${interv.responsavel.nome_completo}${interv.responsavel.cargo ? ` - ${interv.responsavel.cargo}` : ""}`
        : "—",
    })),
    avaliacoesPedagogicas: avaliacoes_pedagogicas.map((av) => ({
      Data: formatReportDate(av.data_avaliacao),
      Motivo: av.motivo_intervencao_nome || av.motivo_intervencao || "—",
      "Classificação educacional": av.aproveitamento_escolar_nome || "—",
      "Descrição da condução": av.descricao_conducao || "—",
      "Estratégias aplicadas": av.estrategias_aplicadas || "—",
      "Manifestação do jovem": av.manifestacao_jovem || "—",
      "Parecer final": av.parecer_final || "—",
      Responsável: av.responsavel
        ? `${av.responsavel.nome_completo}${av.responsavel.cargo ? ` - ${av.responsavel.cargo}` : ""}`
        : "—",
      "Assinatura profissional": av.assinatura_profissional
        ? "✓ Assinado"
        : "—",
      "Assinatura do jovem": av.assinatura_jovem ? "✓ Assinado" : "—",
    })),
    encaminhamentos: encaminhamentos.map((enc) => ({
      Data: formatReportDate(enc.data_encaminhamento),
      Instituição: enc.destino_instituicao || "—",
      "Destino/Área": enc.destino_nome || "—",
      Cargo: enc.destino_cargo || "—",
      Contato: enc.destino_contato || "—",
      "Modelo usado": enc.modelo_encaminhamento_nome || "—",
      "Retorno previsto": formatReportDate(enc.retorno_previsto),
      Descrição: enc.descricao_encaminhamento || "—",
      Responsável: enc.responsavel
        ? `${enc.responsavel.nome_completo}${enc.responsavel.cargo ? ` - ${enc.responsavel.cargo}` : ""}`
        : "—",
    })),
    historicoStatus: status_history.map((hist) => ({
      Data: formatReportDateTime(hist.changed_at),
      "Status anterior": hist.previous_status
        ? formatStatus(hist.previous_status)
        : "—",
      "Novo status": formatStatus(hist.new_status),
      Motivo: hist.reason || "—",
      "Alterado por": `${hist.changed_by.nome_completo}${hist.changed_by.cargo ? ` - ${hist.changed_by.cargo}` : ""}`,
    })),
    timeline: timeline.map((item) => ({
      Data: formatReportDateTime(item.data_evento || item.created_at),
      Tipo: formatCodeLabel(item.tipo_evento, {
        intervencao: "Intervencao",
        pedagogica: "Avaliacao pedagogica",
        socioeconomica: "Avaliacao socioeconomica",
        encaminhamento: "Encaminhamento",
      }),
      Titulo: item.titulo,
      Resumo: item.resumo || "—",
      "Status do jovem": item.status_jovem
        ? formatStatus(item.status_jovem as any)
        : "—",
      Responsável: item.responsavel
        ? `${item.responsavel.nome_completo}${item.responsavel.cargo ? ` - ${item.responsavel.cargo}` : ""}`
        : "—",
    })),
    evolucao: {
      "Ultimo status": formatStatus(personal_data.status),
      "Total de marcos na timeline": timeline.length.toString(),
      "Total de mudancas de status": status_history.length.toString(),
      "Primeira intervencao": formatReportDate(statistics.primeira_intervencao),
      "Ultima intervencao": formatReportDate(statistics.ultima_intervencao),
      "Dias de vinculo": statistics.dias_ativo?.toString() || "—",
    },
    historicoPedagogico: {
      avaliacoes: pedagogical_history.avaliacoes.map((item) => ({
        Data: formatReportDate(item.data),
        Motivo: item.motivo || "—",
        Aproveitamento: item.aproveitamento || "—",
        "Parecer final": item.parecer_final || "—",
        "Plano de acao": item.plano_acao || "—",
        Responsável: item.responsavel || "—",
      })),
      conselhosClasse: pedagogical_history.conselhos_classe.map((item) => ({
        "Data da reuniao": formatReportDate(item.data_reuniao),
        Periodo: item.periodo || "—",
        Turma: item.turma || "—",
        Descricao: item.descricao || "—",
        Dificuldades: item.dificuldades.join(", ") || "—",
        "Plano de acao": item.plano_acao || "—",
        "Parecer da turma": item.parecer_turma || "—",
      })),
    },
    historicoFaltas: {
      disponivel: attendance_history.available ? "Sim" : "Nao",
      observacao: attendance_history.message,
      registros: attendance_history.records.map((item) => ({
        Data: formatReportDate(item.data),
        Status: item.status || "—",
        Observacoes: item.observacoes || "—",
        Responsavel: item.responsavel || "—",
      })),
    },
    estatisticas: {
      "Total de intervenções": statistics.total_intervencoes.toString(),
      "Total de avaliações pedagógicas":
        statistics.total_avaliacoes_pedagogicas.toString(),
      "Total de avaliações socioeconômicas":
        statistics.total_avaliacoes_socioeconomicas.toString(),
      "Total de encaminhamentos": statistics.total_encaminhamentos.toString(),
      "Dias ativo": statistics.dias_ativo?.toString() || "—",
      "Primeira intervenção": formatReportDate(statistics.primeira_intervencao),
      "Última intervenção": formatReportDate(statistics.ultima_intervencao),
    },
  };
}
