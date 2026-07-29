import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para buscar pendências de jovens.
 * Centraliza as chamadas ao backend (regras no banco).
 */
export function usePendencias() {
  const fetchPendencias = useCallback(
    async (jovemId: string): Promise<string[]> => {
      const { data, error } = await supabase.rpc("get_jovem_pendencias", {
        p_jovem_id: jovemId,
      });

      if (error) {
        console.error("Erro ao buscar pendências:", error);
        return [];
      }

      return Array.isArray(data) ? data : [];
    },
    [],
  );

  const fetchPendenciasBatch = useCallback(
    async (jovemIds: string[]): Promise<Record<string, string[]>> => {
      if (jovemIds.length === 0) return {};

      const { data, error } = await supabase.rpc("get_pendencias_por_jovens", {
        p_jovem_ids: jovemIds,
      });

      if (error) {
        console.error("Erro ao buscar pendências em batch:", error);
        return {};
      }

      const map: Record<string, string[]> = {};
      (data ?? []).forEach(
        (row: { jovem_id: string; pendencias: string[] }) => {
          map[row.jovem_id] = Array.isArray(row.pendencias)
            ? row.pendencias
            : [];
        },
      );

      return map;
    },
    [],
  );

  return { fetchPendencias, fetchPendenciasBatch };
}
