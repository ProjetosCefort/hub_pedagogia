import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { getPendenciaLabel, isCriticalPendencia } from "@/lib/pendencias";

interface PendenciasBadgeProps {
  pendencias: string[];
  /** Se true, exibe apenas o badge compacto. Se false, exibe lista completa (para Prontuário). */
  compact?: boolean;
  className?: string;
}

export function PendenciasBadge({
  pendencias,
  compact = true,
  className,
}: PendenciasBadgeProps) {
  if (!pendencias || pendencias.length === 0) return null;
  const hasCritical = pendencias.some(isCriticalPendencia);
  const colorClass = hasCritical
    ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";

  if (compact) {
    return (
      <Badge
        variant="outline"
        className={`gap-1 ${colorClass} ${className ?? ""}`}
      >
        <AlertCircle className="w-3 h-3" />
        Pendências ({pendencias.length})
      </Badge>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${hasCritical ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
        <AlertCircle className="w-4 h-4" />
        Pendências ({pendencias.length})
      </div>
      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        {pendencias.map((codigo) => (
          <li key={codigo}>{getPendenciaLabel(codigo)}</li>
        ))}
      </ul>
    </div>
  );
}
