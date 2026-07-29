import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_POLL_INTERVAL = 60_000;

export interface InternalNotification {
  id: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  jovem_id: string | null;
  destinatario_role: string;
}

interface UseNotificacoesResult {
  notifications: InternalNotification[];
  unreadCount: number;
  loading: boolean;
  hasAccess: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotificacoes(pollInterval = DEFAULT_POLL_INTERVAL): UseNotificacoesResult {
  const { user, roles } = useAuth();
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const normalizedRoles = useMemo(() => roles.filter(Boolean), [roles]);
  const isAdmin = normalizedRoles.includes("admin");
  const hasAccess = Boolean(user) && normalizedRoles.length > 0;

  const buildRoleFilter = useCallback(
    (query: any) => {
      if (!isAdmin && normalizedRoles.length > 0) {
        return query.in("destinatario_role", normalizedRoles);
      }
      return query;
    },
    [isAdmin, normalizedRoles],
  );

  const fetchNotifications = useCallback(async () => {
    if (!hasAccess) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const listQuery = buildRoleFilter(
        supabase
          .from("notificacoes_internas")
          .select(
            `
              id,
              mensagem,
              lida,
              created_at,
              related_entity_type,
              related_entity_id,
              jovem_id,
              destinatario_role
            `,
          )
          .order("created_at", { ascending: false })
          .limit(10),
      );

      const countQuery = buildRoleFilter(
        supabase
          .from("notificacoes_internas")
          .select("id", { count: "exact", head: true })
          .eq("lida", false),
      );

      const [{ data: listData, error: listError }, { count, error: countError }] = await Promise.all([
        listQuery,
        countQuery,
      ]);

      if (listError) {
        console.error("Erro ao carregar notificações", listError);
      } else if (listData) {
        setNotifications(listData);
      }

      if (countError) {
        console.error("Erro ao contar notificações", countError);
      } else {
        setUnreadCount(count ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [buildRoleFilter, hasAccess]);

  useEffect(() => {
    fetchNotifications();
    if (!hasAccess || pollInterval <= 0) {
      return;
    }
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, hasAccess, pollInterval]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!hasAccess) return;
      await buildRoleFilter(
        supabase.from("notificacoes_internas").update({ lida: true }).eq("id", id),
      );
      await fetchNotifications();
    },
    [buildRoleFilter, fetchNotifications, hasAccess],
  );

  const markAllAsRead = useCallback(async () => {
    if (!hasAccess) return;
    await buildRoleFilter(
      supabase.from("notificacoes_internas").update({ lida: true }).eq("lida", false),
    );
    await fetchNotifications();
  }, [buildRoleFilter, fetchNotifications, hasAccess]);

  return {
    notifications,
    unreadCount,
    loading,
    hasAccess,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
