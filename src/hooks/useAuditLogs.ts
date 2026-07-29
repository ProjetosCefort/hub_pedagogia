import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action_type: "create" | "update" | "delete" | "status_change";
  changed_by: string;
  changed_at: string;
  diff_json: any;
  metadata: any;
  changed_by_profile?: {
    nome_completo: string;
    email: string;
  };
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  actionType?: "create" | "update" | "delete" | "status_change";
  changedBy?: string;
  startDate?: string;
  endDate?: string;
}

interface UseAuditLogsParams {
  filters?: AuditLogFilters;
  page?: number;
  pageSize?: number;
}

export function useAuditLogs({
  filters,
  page = 1,
  pageSize = 20,
}: UseAuditLogsParams = {}) {
  return useQuery({
    queryKey: ["audit_logs", filters, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Buscar logs primeiro
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("changed_at", { ascending: false })
        .range(from, to);

      // Aplicar filtros
      if (filters?.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }

      if (filters?.entityId) {
        query = query.eq("entity_id", filters.entityId);
      }

      if (filters?.actionType) {
        query = query.eq("action_type", filters.actionType);
      }

      if (filters?.changedBy) {
        query = query.eq("changed_by", filters.changedBy);
      }

      if (filters?.startDate) {
        query = query.gte("changed_at", filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte("changed_at", filters.endDate);
      }

      const { data: logsData, error, count } = await query;

      if (error) {
        throw error;
      }

      if (!logsData || logsData.length === 0) {
        return {
          logs: [],
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
        };
      }

      // Buscar profiles dos usuários
      const userIds = [...new Set(logsData.map((log: any) => log.changed_by))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, nome_completo, email")
        .in("id", userIds);

      // Criar mapa de profiles
      const profilesMap = new Map(
        (profilesData || []).map((profile: any) => [profile.id, profile]),
      );

      // Combinar logs com profiles
      const logs = logsData.map((log: any) => ({
        ...log,
        changed_by_profile: profilesMap.get(log.changed_by) || null,
      })) as AuditLog[];

      return {
        logs,
        total: count || logs.length,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      };
    },
  });
}
