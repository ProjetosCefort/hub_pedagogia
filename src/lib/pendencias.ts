/**
 * Mapeamento de códigos de pendência (retornados pelo backend) para labels de exibição.
 * A lógica de regras está centralizada no backend (get_jovem_pendencias).
 */

export const PENDENCIA_LABELS: Record<string, string> = {
  avaliacao_socioeconomica_faltando: "Avaliação socioeconômica faltando",
  avaliacao_pedagogica_faltando: "Avaliação pedagógica faltando",
  sem_intervencoes: "Nenhuma intervenção registrada",
  sem_empresa_aprovado: "Empresa não atribuída (jovem aprovado)",
  documentos_obrigatorios_faltando: "Documentos obrigatórios faltando",
  documento_vencido: "Documento vencido",
} as const;

export type PendenciaCodigo = keyof typeof PENDENCIA_LABELS;

export const CRITICAL_PENDENCIAS = [
  "sem_empresa_aprovado",
  "documentos_obrigatorios_faltando",
  "documento_vencido",
] as const;

export function isCriticalPendencia(codigo: string): boolean {
  return CRITICAL_PENDENCIAS.includes(
    codigo as (typeof CRITICAL_PENDENCIAS)[number],
  );
}

export function getPendenciaLabel(codigo: string): string {
  return PENDENCIA_LABELS[codigo] ?? codigo;
}
