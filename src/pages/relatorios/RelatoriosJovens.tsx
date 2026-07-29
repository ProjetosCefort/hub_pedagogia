import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UnidadeOption {
  id: string;
  nome: string;
}

interface EmpresaOption {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
}

interface TurmaOption {
  id: string;
  nome: string;
  codigo: string;
}

interface RelatorioJovemRow {
  id: string;
  nome_completo: string;
  cpf: string | null;
  matricula: string | null;
  status: string;
  sexo: string | null;
  raca: string | null;
  cidade: string | null;
  estado: string | null;
  data_admissao: string | null;
  data_desligamento: string | null;
  empresa: { nome_fantasia: string | null; razao_social: string | null } | null;
  turma: { nome: string | null; codigo: string | null } | null;
  unidade: { nome: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  completed: "Completo",
  under_analysis: "Em analise",
  pending_documents: "Documentos pendentes",
  approved: "Aprovado",
  rejected: "Rejeitado",
  active_apprentice: "Aprendiz ativo",
  inactive: "Inativo",
  terminated: "Desligado",
  completed_program: "Programa concluido",
};

const ACTIVE_STATUSES = ["active_apprentice"];
const INACTIVE_STATUSES = ["inactive", "terminated", "completed_program"];

function formatDate(value: string | null) {
  if (!value) return "—";
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

function csvEscape(value: string | null | undefined) {
  const normalized = value ?? "";
  return `"${normalized.replaceAll('"', '""')}"`;
}

export default function RelatoriosJovens() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [rows, setRows] = useState<RelatorioJovemRow[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusGroupFilter, setStatusGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [unidadeFilter, setUnidadeFilter] = useState("all");
  const [empresaFilter, setEmpresaFilter] = useState("all");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [sexoFilter, setSexoFilter] = useState("all");
  const [racaFilter, setRacaFilter] = useState("all");

  useEffect(() => {
    fetchOptions();
    fetchRows();
  }, []);

  async function fetchOptions() {
    const [{ data: unidadesData }, { data: empresasData }, { data: turmasData }] =
      await Promise.all([
        supabase.from("unidades").select("id, nome").order("nome"),
        supabase
          .from("empresas")
          .select("id, nome_fantasia, razao_social")
          .order("razao_social"),
        supabase.from("turmas").select("id, nome, codigo").order("nome"),
      ]);

    setUnidades((unidadesData || []) as UnidadeOption[]);
    setEmpresas((empresasData || []) as EmpresaOption[]);
    setTurmas((turmasData || []) as TurmaOption[]);
  }

  async function fetchRows() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jovens")
        .select(`
          id,
          nome_completo,
          cpf,
          matricula,
          status,
          sexo,
          raca,
          cidade,
          estado,
          data_admissao,
          data_desligamento,
          empresa:empresas!jovens_empresa_id_fkey(nome_fantasia, razao_social),
          turma:turmas!jovens_turma_id_fkey(nome, codigo),
          unidade:unidades!jovens_unidade_id_fkey(nome)
        `)
        .order("nome_completo");

      if (error) throw error;
      setRows((data || []) as unknown as RelatorioJovemRow[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatorios",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      const search = searchTerm.trim().toLowerCase();
      if (
        search &&
        ![
          item.nome_completo,
          item.cpf || "",
          item.matricula || "",
          item.empresa?.nome_fantasia || "",
          item.empresa?.razao_social || "",
          item.unidade?.nome || "",
          item.turma?.nome || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }

      if (statusGroupFilter === "active" && !ACTIVE_STATUSES.includes(item.status)) {
        return false;
      }
      if (statusGroupFilter === "inactive" && !INACTIVE_STATUSES.includes(item.status)) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (unidadeFilter !== "all" && item.unidade?.nome !== unidades.find((u) => u.id === unidadeFilter)?.nome) {
        return false;
      }
      if (empresaFilter !== "all" && item.empresa?.razao_social !== empresas.find((e) => e.id === empresaFilter)?.razao_social) {
        return false;
      }
      if (turmaFilter !== "all" && item.turma?.codigo !== turmas.find((t) => t.id === turmaFilter)?.codigo) {
        return false;
      }
      if (sexoFilter !== "all" && (item.sexo || "").toLowerCase() !== sexoFilter.toLowerCase()) {
        return false;
      }
      if (racaFilter !== "all" && (item.raca || "").toLowerCase() !== racaFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [
    rows,
    searchTerm,
    statusGroupFilter,
    statusFilter,
    unidadeFilter,
    empresaFilter,
    turmaFilter,
    sexoFilter,
    racaFilter,
    unidades,
    empresas,
    turmas,
  ]);

  async function handleExportCsv() {
    if (filteredRows.length === 0) {
      toast({
        title: "Nada para exportar",
        description: "Ajuste os filtros para gerar um relatorio com dados.",
      });
      return;
    }

    try {
      setExporting(true);
      const header = [
        "Nome completo",
        "CPF",
        "Matricula",
        "Status",
        "Sexo",
        "Raca/Cor",
        "Unidade",
        "Empresa",
        "Turma",
        "Cidade",
        "Estado",
        "Data admissao",
        "Data desligamento",
      ];

      const lines = filteredRows.map((item) =>
        [
          item.nome_completo,
          item.cpf,
          item.matricula,
          STATUS_LABELS[item.status] || item.status,
          item.sexo,
          item.raca,
          item.unidade?.nome || "",
          item.empresa?.nome_fantasia || item.empresa?.razao_social || "",
          item.turma?.nome || "",
          item.cidade,
          item.estado,
          item.data_admissao,
          item.data_desligamento,
        ]
          .map(csvEscape)
          .join(","),
      );

      const csv = [header.map(csvEscape).join(","), ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-jovens-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const totalAtivos = filteredRows.filter((item) =>
    ACTIVE_STATUSES.includes(item.status),
  ).length;
  const totalInativos = filteredRows.filter((item) =>
    INACTIVE_STATUSES.includes(item.status),
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Relatorios de jovens</h1>
          <p className="page-description">
            Gere recortes administrativos e exporte relatorios coletivos em massa.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exportando..." : "Exportar CSV"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total filtrado</CardDescription>
            <CardTitle className="text-2xl">{filteredRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ativos</CardDescription>
            <CardTitle className="text-2xl">{totalAtivos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inativos</CardDescription>
            <CardTitle className="text-2xl">{totalInativos}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros institucionais
          </CardTitle>
          <CardDescription>
            Filtre por situacao, unidade, empresa, turma, sexo e raça/cor.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <Label>Busca</Label>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nome, CPF, matricula, empresa..."
            />
          </div>
          <div>
            <Label>Grupo de status</Label>
            <Select value={statusGroupFilter} onValueChange={setStatusGroupFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status detalhado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidade</Label>
            <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {unidades.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Empresa</Label>
            <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {empresas.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome_fantasia || item.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Turma</Label>
            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {turmas.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sexo</Label>
            <Select value={sexoFilter} onValueChange={setSexoFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Raça/Cor</Label>
            <Select value={racaFilter} onValueChange={setRacaFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="branca">Branca</SelectItem>
                <SelectItem value="preta">Preta</SelectItem>
                <SelectItem value="parda">Parda</SelectItem>
                <SelectItem value="amarela">Amarela</SelectItem>
                <SelectItem value="indigena">Indígena</SelectItem>
                <SelectItem value="nao_informada">Não informada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Resultado consolidado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              Carregando relatorios...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhum jovem encontrado para os filtros selecionados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Raça/Cor</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Admissao</TableHead>
                  <TableHead>Desligamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.nome_completo}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.matricula || "Sem matricula"}
                      </div>
                    </TableCell>
                    <TableCell>{STATUS_LABELS[item.status] || item.status}</TableCell>
                    <TableCell>{item.sexo || "—"}</TableCell>
                    <TableCell>{item.raca || "—"}</TableCell>
                    <TableCell>{item.unidade?.nome || "—"}</TableCell>
                    <TableCell>
                      {item.empresa?.nome_fantasia || item.empresa?.razao_social || "—"}
                    </TableCell>
                    <TableCell>{item.turma?.nome || "—"}</TableCell>
                    <TableCell>{formatDate(item.data_admissao)}</TableCell>
                    <TableCell>{formatDate(item.data_desligamento)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
