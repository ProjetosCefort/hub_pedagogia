import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InscricaoStatusHistoryItem {
  id: string;
  inscricao_id: string;
  previous_status: string | null;
  new_status: string;
  motivo: string | null;
  observacao: string | null;
  origem: string;
  changed_by: string | null;
  created_at: string;
}

export interface InscricaoReprovacaoItem {
  id: string;
  inscricao_id: string;
  actor_id: string | null;
  motivo: string;
  observacao: string | null;
  origem: string;
  created_at: string;
  retornada_ao_banco_em: string | null;
  retornada_por: string | null;
  retorno_observacao: string | null;
}

export function useInscricaoStatusHistory(inscricaoId?: string, enabled = true) {
  const [history, setHistory] = useState<InscricaoStatusHistoryItem[]>([]);
  const [reprovacoes, setReprovacoes] = useState<InscricaoReprovacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!inscricaoId || !enabled) {
      setHistory([]);
      setReprovacoes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [historyRes, reprovacoesRes] = await Promise.all([
        supabase
          .from("inscricoes_status_history")
          .select(
            "id, inscricao_id, previous_status, new_status, motivo, observacao, origem, changed_by, created_at",
          )
          .eq("inscricao_id", inscricaoId)
          .order("created_at", { ascending: false }),
        supabase
          .from("inscricoes_reprovacoes")
          .select(
            "id, inscricao_id, actor_id, motivo, observacao, origem, created_at, retornada_ao_banco_em, retornada_por, retorno_observacao",
          )
          .eq("inscricao_id", inscricaoId)
          .order("created_at", { ascending: false }),
      ]);

      if (historyRes.error) throw historyRes.error;
      if (reprovacoesRes.error) throw reprovacoesRes.error;

      setHistory((historyRes.data as InscricaoStatusHistoryItem[]) ?? []);
      setReprovacoes((reprovacoesRes.data as InscricaoReprovacaoItem[]) ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }, [enabled, inscricaoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    history,
    reprovacoes,
    loading,
    error,
    refetch: fetchData,
  };
}
