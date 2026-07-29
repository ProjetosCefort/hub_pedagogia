import { supabase } from "@/integrations/supabase/client";

export type AuditActionType = "create" | "update" | "delete" | "status_change";

export interface AuditLogParams {
  entityType: string;
  entityId: string;
  actionType: AuditActionType;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

/**
 * Registra log de auditoria. Falha em silêncio se a função log_audit
 * não existir no banco (ex.: projeto sem migrações de auditoria).
 */
export async function logAudit(params: AuditLogParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("log_audit", {
      p_entity_type: params.entityType,
      p_entity_id: params.entityId,
      p_action_type: params.actionType,
      p_old_data: params.oldData ? (params.oldData as any) : null,
      p_new_data: params.newData ? (params.newData as any) : null,
      p_metadata: params.metadata ? (params.metadata as any) : null,
    });

    if (error) {
      if (error.code !== "PGRST202" && error.code !== "42883") {
        console.warn("Auditoria:", error.message);
      }
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Helper para calcular diferenças entre objetos (para updates)
 */
export function calculateDiff(
  oldData: Record<string, any>,
  newData: Record<string, any>,
): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];

    if (oldValue !== newValue) {
      diff[key] = { old: oldValue, new: newValue };
    }
  }

  return diff;
}
