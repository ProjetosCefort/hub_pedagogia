import { useEffect, useState } from "react";
import { FileText, Filter, Calendar, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuditLogs, AuditLogFilters } from "@/hooks/useAuditLogs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ENTITY_TYPES = [
  { value: "intervencoes", label: "Intervenções" },
  { value: "avaliacoes_pedagogicas", label: "Avaliações Pedagógicas" },
  { value: "avaliacoes_socioeconomicas", label: "Avaliações Socioeconômicas" },
  { value: "encaminhamentos", label: "Encaminhamentos" },
  { value: "jovens", label: "Jovens" },
];

const ACTION_TYPES = [
  { value: "create", label: "Criação", color: "bg-green-500" },
  { value: "update", label: "Atualização", color: "bg-blue-500" },
  { value: "delete", label: "Exclusão", color: "bg-red-500" },
  {
    value: "status_change",
    label: "Mudança de Status",
    color: "bg-purple-500",
  },
];

const PAGE_SIZE = 20;
const ALL_ENTITY_TYPES = "all-entity-types";
const ALL_ACTION_TYPES = "all-action-types";

export default function AuditLogs() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useAuditLogs({
    filters,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const logs = data?.logs || [];
  const totalLogs = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleFilterChange = (
    key: keyof AuditLogFilters,
    value: string | undefined,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const getActionBadge = (actionType: string) => {
    const action = ACTION_TYPES.find((a) => a.value === actionType);
    if (!action) return null;
    return (
      <Badge className={`${action.color} text-white`}>{action.label}</Badge>
    );
  };

  const getEntityLabel = (entityType: string) => {
    const entity = ENTITY_TYPES.find((e) => e.value === entityType);
    return entity?.label || entityType;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Logs de Auditoria
        </h1>
        <p className="page-description">
          Visualize todas as ações realizadas no sistema
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Filtre os logs por entidade, ação, usuário ou data
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar" : "Mostrar"} Filtros
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="entity_type">Tipo de Entidade</Label>
                <Select
                  value={filters.entityType || ALL_ENTITY_TYPES}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "entityType",
                      value === ALL_ENTITY_TYPES ? undefined : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ENTITY_TYPES}>Todos</SelectItem>
                    {ENTITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="action_type">Tipo de Ação</Label>
                <Select
                  value={filters.actionType || ALL_ACTION_TYPES}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "actionType",
                      value === ALL_ACTION_TYPES ? undefined : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ACTION_TYPES}>Todas</SelectItem>
                    {ACTION_TYPES.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="start_date">Data Inicial</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="end_date">Data Final</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
          <CardDescription>
            {totalLogs} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Carregando logs...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Erro ao carregar logs: {error.message}
            </div>
          )}

          {!isLoading && !error && logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado com os filtros selecionados
            </div>
          )}

          {!isLoading && !error && logs.length > 0 && (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActionBadge(log.action_type)}
                        <Badge variant="outline">
                          {getEntityLabel(log.entity_type)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ID: {log.entity_id.slice(0, 8)}...
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>
                            {log.changed_by_profile?.nome_completo ||
                              log.changed_by_profile?.email ||
                              "Usuário desconhecido"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(
                              new Date(log.changed_at),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR },
                            )}
                          </span>
                        </div>
                      </div>

                      {log.diff_json && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                            Ver detalhes da alteração
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                            {JSON.stringify(log.diff_json, null, 2)}
                          </pre>
                        </details>
                      )}

                      {log.metadata && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                            Ver metadados
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {totalLogs === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{" "}
                  {Math.min(totalLogs, currentPage * PAGE_SIZE)} de {totalLogs}
                </p>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#" isActive onClick={(e) => e.preventDefault()}>
                        {currentPage} / {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
