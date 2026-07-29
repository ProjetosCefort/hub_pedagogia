/**
 * Sistema de indicadores visuais de status para registros de jovens.
 *
 * Regras:
 * - Verde: Aprendiz ativo (active_apprentice) + Sem pendências
 * - Amarelo: Em análise / inativo / documentos pendentes OU tem pendências normais
 * - Vermelho: Pendências críticas
 */
import { isCriticalPendencia } from "@/lib/pendencias";

export type StatusIndicatorType = "green" | "yellow" | "red";

export type JovemStatus =
  | "draft"
  | "completed"
  | "under_analysis"
  | "pending_documents"
  | "approved"
  | "rejected"
  | "active_apprentice"
  | "inactive"
  | "terminated"
  | "completed_program";

/**
 * Calcula o indicador visual de status baseado no status do jovem e suas pendências.
 *
 * @param status - Status do jovem (ciclo de vida)
 * @param pendencias - Array de códigos de pendências
 * @returns Tipo de indicador visual (green, yellow, red)
 */
export function calculateStatusIndicator(
  status: JovemStatus,
  pendencias: string[] = [],
): StatusIndicatorType {
  if (pendencias.length === 0) {
    if (status === "active_apprentice") return "green";
    if (
      status === "under_analysis" ||
      status === "pending_documents" ||
      status === "inactive"
    )
      return "yellow";
    if (status === "draft" || status === "completed" || status === "approved")
      return "yellow";
    if (
      status === "rejected" ||
      status === "terminated" ||
      status === "completed_program"
    )
      return "yellow";
    return "yellow";
  }

  const hasCriticalPendencias = pendencias.some(isCriticalPendencia);
  if (hasCriticalPendencias) return "red";

  if (
    status === "inactive" ||
    status === "under_analysis" ||
    status === "pending_documents" ||
    pendencias.length > 0
  ) {
    return "yellow";
  }

  return status === "active_apprentice" ? "green" : "yellow";
}

/**
 * Retorna a label descritiva do status visual
 */
export function getStatusIndicatorLabel(type: StatusIndicatorType): string {
  switch (type) {
    case "green":
      return "Aprovado";
    case "yellow":
      return "Em análise";
    case "red":
      return "Pendências críticas";
  }
}

/**
 * Retorna a descrição detalhada do status visual
 */
export function getStatusIndicatorDescription(
  type: StatusIndicatorType,
  status: JovemStatus,
  pendencias: string[] = [],
): string {
  switch (type) {
    case "green":
      return "Aprendiz ativo e sem pendências";
    case "yellow":
      if (
        status === "inactive" ||
        status === "under_analysis" ||
        status === "pending_documents"
      ) {
        return "Em análise ou inativo";
      }
      if (pendencias.length > 0) {
        return `Possui ${pendencias.length} pendência${pendencias.length > 1 ? "s" : ""}`;
      }
      return "Em análise";
    case "red": {
      const criticalCount = pendencias.filter(isCriticalPendencia).length;
      return `Possui ${criticalCount} pendência${criticalCount > 1 ? "s" : ""} crítica${criticalCount > 1 ? "s" : ""}`;
    }
  }
}
