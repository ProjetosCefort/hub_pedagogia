import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PermissionContextType {
  permissions: string[];
  loading: boolean;
  hasPermission: (key: string) => boolean;
  refreshPermissions: () => Promise<void>;
  sectors: Array<"psicossocial" | "servico_social" | "pedagogico">;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

const ROLE_FALLBACK: Record<string, string[]> = {
  admin: ["*"],
  gestor: [
    "dashboard.read",
    "jovens.read",
    "jovens.write",
    "inscricoes.read",
    "inscricoes.status.manage",
    "agenda.read",
    "agenda.write",
    "intervencoes_psicossocial.read",
    "intervencoes_psicossocial.write",
    "atendimentos_servico_social.read",
    "atendimentos_servico_social.write",
    "jovem_vagas.read",
    "jovem_vagas.write",
    "menu.setor.vagas",
    "projetos.read",
    "projetos.write",
    "certificacoes.read",
    "certificacoes.write",
    "conselho_classe.read",
    "conselho_classe.write",
    "avaliacoes_pedagogicas.read",
    "avaliacoes_pedagogicas.write",
    "avaliacoes_socioeconomicas.read",
    "avaliacoes_socioeconomicas.write",
    "encaminhamentos.read",
    "encaminhamentos.write",
    "cadastros.read",
    "cadastros.write",
    "configuracoes.read",
    "configuracoes.write",
    "auditoria.read",
    "rbac.manage",
  ],
  analista_psicossocial: [
    "dashboard.read",
    "jovens.read",
    "inscricoes.read",
    "inscricoes.status.manage",
    "agenda.read",
    "agenda.write",
    "intervencoes_psicossocial.read",
    "intervencoes_psicossocial.write",
    "atendimentos_servico_social.read",
    "menu.setor.psicossocial",
    "projetos.read",
  ],
  analista_social: [
    "dashboard.read",
    "jovens.read",
    "inscricoes.read",
    "inscricoes.status.manage",
    "agenda.read",
    "agenda.write",
    "intervencoes_psicossocial.read",
    "atendimentos_servico_social.read",
    "atendimentos_servico_social.write",
    "avaliacoes_socioeconomicas.read",
    "avaliacoes_socioeconomicas.write",
    "encaminhamentos.read",
    "encaminhamentos.write",
    "menu.setor.servico_social",
    "projetos.read",
    "certificacoes.read",
    "certificacoes.write",
  ],
  analista_pedagogico: [
    "dashboard.read",
    "jovens.read",
    "inscricoes.read",
    "inscricoes.status.manage",
    "agenda.read",
    "agenda.write",
    "avaliacoes_pedagogicas.read",
    "avaliacoes_pedagogicas.write",
    "menu.setor.pedagogico",
    "jovem_vagas.read",
    "jovem_vagas.write",
    "menu.setor.vagas",
    "projetos.read",
    "projetos.write",
    "certificacoes.read",
    "conselho_classe.read",
    "conselho_classe.write",
  ],
};

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const didInitialLoadRef = useRef(false);

  const loadPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions((prev) => (prev.length === 0 ? prev : []));
      setLoading(false);
      didInitialLoadRef.current = true;
      return;
    }

    // Evita "piscar" o app inteiro em refetch de foco/sessão.
    if (!didInitialLoadRef.current) {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase.rpc("list_my_permissions" as any);

      if (error) {
        throw error;
      }

      const fromRpc = Array.isArray(data)
        ? data
            .map((row: any) => row?.permission_key)
            .filter((key: string | null | undefined) => !!key)
        : [];

      const fallback = roles.flatMap((role) => ROLE_FALLBACK[role] ?? []);
      const merged = Array.from(new Set([...fromRpc, ...fallback])).sort();
      setPermissions((prev) => {
        const prevSorted = [...prev].sort();
        const same =
          prevSorted.length === merged.length &&
          prevSorted.every((perm, idx) => perm === merged[idx]);
        return same ? prev : merged;
      });
    } catch {
      const fallback = roles.flatMap((role) => ROLE_FALLBACK[role] ?? []);
      const mergedFallback = Array.from(new Set(fallback)).sort();
      setPermissions((prev) => {
        const prevSorted = [...prev].sort();
        const same =
          prevSorted.length === mergedFallback.length &&
          prevSorted.every((perm, idx) => perm === mergedFallback[idx]);
        return same ? prev : mergedFallback;
      });
    } finally {
      didInitialLoadRef.current = true;
      setLoading(false);
    }
  }, [roles, user?.id]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback(
    (key: string) => permissions.includes("*") || permissions.includes(key),
    [permissions],
  );

  const sectors = useMemo<Array<"psicossocial" | "servico_social" | "pedagogico">>(() => {
    const result: Array<"psicossocial" | "servico_social" | "pedagogico"> = [];

    if (hasPermission("*") || hasPermission("menu.setor.psicossocial")) {
      result.push("psicossocial");
    }
    if (hasPermission("*") || hasPermission("menu.setor.servico_social")) {
      result.push("servico_social");
    }
    if (hasPermission("*") || hasPermission("menu.setor.pedagogico")) {
      result.push("pedagogico");
    }

    if (result.length === 0 && (roles.includes("admin") || roles.includes("gestor"))) {
      return ["psicossocial", "servico_social", "pedagogico"];
    }

    return result;
  }, [hasPermission, roles]);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        hasPermission,
        refreshPermissions: loadPermissions,
        sectors,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissionContext must be used within PermissionProvider");
  }
  return context;
}
