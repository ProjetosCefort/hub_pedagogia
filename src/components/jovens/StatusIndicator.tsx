import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import {
  StatusIndicatorType,
  calculateStatusIndicator,
  getStatusIndicatorLabel,
  getStatusIndicatorDescription,
  JovemStatus,
} from "@/lib/status-indicator";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: JovemStatus;
  pendencias?: string[];
  /** Se true, exibe apenas o badge compacto. Se false, exibe com descrição. */
  compact?: boolean;
  className?: string;
  /** Se true, exibe o ícone junto com o texto */
  showIcon?: boolean;
}

/**
 * Componente de indicador visual de status para registros de jovens.
 * 
 * Exibe badge colorido baseado em:
 * - Verde: Aprovado + Sem pendências
 * - Amarelo: Em análise OU tem pendências normais
 * - Vermelho: Pendências críticas
 */
export function StatusIndicator({
  status,
  pendencias = [],
  compact = true,
  className,
  showIcon = true,
}: StatusIndicatorProps) {
  const indicatorType = calculateStatusIndicator(status, pendencias);
  const label = getStatusIndicatorLabel(indicatorType);
  const description = getStatusIndicatorDescription(
    indicatorType,
    status,
    pendencias
  );

  const getVariant = (type: StatusIndicatorType) => {
    switch (type) {
      case "green":
        return "default";
      case "yellow":
        return "secondary";
      case "red":
        return "destructive";
    }
  };

  const getIcon = (type: StatusIndicatorType) => {
    if (!showIcon) return null;

    switch (type) {
      case "green":
        return <CheckCircle2 className="w-3 h-3" />;
      case "yellow":
        return <AlertCircle className="w-3 h-3" />;
      case "red":
        return <XCircle className="w-3 h-3" />;
    }
  };

  const getStyles = (type: StatusIndicatorType) => {
    switch (type) {
      case "green":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
      case "yellow":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "red":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
    }
  };

  if (compact) {
    return (
      <Badge
        variant={getVariant(indicatorType)}
        className={cn(
          "flex items-center gap-1 w-fit",
          getStyles(indicatorType),
          className
        )}
        title={description}
      >
        {getIcon(indicatorType)}
        {label}
      </Badge>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Badge
        variant={getVariant(indicatorType)}
        className={cn(
          "flex items-center gap-1 w-fit",
          getStyles(indicatorType)
        )}
      >
        {getIcon(indicatorType)}
        {label}
      </Badge>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
