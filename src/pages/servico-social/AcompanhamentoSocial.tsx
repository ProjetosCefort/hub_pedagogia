import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRightLeft, Heart, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type TipoRegistro = "individual" | "familiar";
type EncaminhamentoDestino = "nenhum" | "pedagogico" | "psicossocial" | "ambos";

interface JovemOption {
  id: string;
  nome_completo: string;
  status: string | null;
}

interface AcompanhamentoSocialRecord {
  id: string;
  jovem_id: string;
  tipo_registro: TipoRegistro;
  data_registro: string;
  titulo: string;
  descricao: string;
  contexto_familiar: string | null;
  encaminhar_pedagogico: boolean;
  encaminhar_psicossocial: boolean;
  solicitacao_pedagogico_id: string | null;
  solicitacao_psicossocial_id: string | null;
  responsavel_id: string | null;
  created_at: string;
  jovem?: {
    nome_completo: string | null;
    status: string | null;
  } | null;
  responsavelNome?: string | null;
}

const tipoLabel: Record<TipoRegistro, string> = {
  individual: "Individual",
  familiar: "Familiar",
};

function buildInitialForm() {
  return {
    jovem_id: "",
    tipo_registro: "individual" as TipoRegistro,
    data_registro: new Date().toISOString().slice(0, 16),
    titulo: "",
    descricao: "",
    contexto_familiar: "",
    encaminhamento_destino: "nenhum" as EncaminhamentoDestino,
  };
}

export default function AcompanhamentoSocial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoRegistro | "all">("all");
  const [records, setRecords] = useState<AcompanhamentoSocialRecord[]>([]);
  const [jovens, setJovens] = useState<JovemOption[]>([]);
  const [formData, setFormData] = useState(buildInitialForm());

  useEffect(() => {
    fetchLookups();
    fetchRecords();
  }, []);

  async function fetchLookups() {
    const { data, error } = await supabase
      .from("jovens")
      .select("id, nome_completo, status")
      .order("nome_completo");

    if (error) {
      console.error("Erro ao carregar jovens:", error);
      return;
    }

    setJovens((data || []) as JovemOption[]);
  }

  async function fetchRecords() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("acompanhamentos_sociais" as any)
        .select(
          `
            id,
            jovem_id,
            tipo_registro,
            data_registro,
            titulo,
            descricao,
            contexto_familiar,
            encaminhar_pedagogico,
            encaminhar_psicossocial,
            solicitacao_pedagogico_id,
            solicitacao_psicossocial_id,
            responsavel_id,
            created_at,
            jovem:jovens(nome_completo, status)
          `,
        )
        .order("data_registro", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as AcompanhamentoSocialRecord[];
      const responsavelIds = Array.from(
        new Set(rows.map((item) => item.responsavel_id).filter(Boolean) as string[]),
      );

      const profilesMap = new Map<string, string>();
      if (responsavelIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", responsavelIds);

        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, profile.nome_completo || "Usuário");
        });
      }

      setRecords(
        rows.map((item) => ({
          ...item,
          responsavelNome: item.responsavel_id
            ? profilesMap.get(item.responsavel_id) || null
            : null,
        })),
      );
    } catch (error: any) {
      toast({
        title: "Erro ao carregar acompanhamentos",
        description: error?.message || "Não foi possível carregar os registros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesTipo =
        tipoFilter === "all" ? true : item.tipo_registro === tipoFilter;
      const matchesSearch = search
        ? [item.titulo, item.descricao, item.jovem?.nome_completo || ""]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      return matchesTipo && matchesSearch;
    });
  }, [records, search, tipoFilter]);

  const summary = useMemo(() => {
    return {
      total: filteredRecords.length,
      individual: filteredRecords.filter((item) => item.tipo_registro === "individual").length,
      familiar: filteredRecords.filter((item) => item.tipo_registro === "familiar").length,
      encaminhados:
        filteredRecords.filter(
          (item) => item.encaminhar_pedagogico || item.encaminhar_psicossocial,
        ).length,
    };
  }, [filteredRecords]);

  async function handleCreate() {
    if (!formData.jovem_id || !formData.titulo || !formData.descricao) {
      toast({
        title: "Preencha os campos obrigatórios",
        description: "Selecione o jovem e informe título e descrição.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const encaminharPedagogico =
        formData.encaminhamento_destino === "pedagogico" ||
        formData.encaminhamento_destino === "ambos";
      const encaminharPsicossocial =
        formData.encaminhamento_destino === "psicossocial" ||
        formData.encaminhamento_destino === "ambos";

      const payload = {
        jovem_id: formData.jovem_id,
        tipo_registro: formData.tipo_registro,
        data_registro: new Date(formData.data_registro).toISOString(),
        titulo: formData.titulo,
        descricao: formData.descricao,
        contexto_familiar: formData.contexto_familiar || null,
        encaminhar_pedagogico: encaminharPedagogico,
        encaminhar_psicossocial: encaminharPsicossocial,
        responsavel_id: user?.id ?? null,
        created_by: user?.id ?? null,
      };

      const { data: inserted, error } = await supabase
        .from("acompanhamentos_sociais" as any)
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      const acompanhamentoId = inserted.id as string;
      const solicitacaoIds: {
        pedagogico?: string;
        psicossocial?: string;
      } = {};

      if (encaminharPedagogico || encaminharPsicossocial) {
        const solicitacoesPayload = [];

        if (encaminharPedagogico) {
          solicitacoesPayload.push({
            jovem_id: formData.jovem_id,
            setor_origem: "servico_social",
            setor_destino: "pedagogico",
            titulo: `[Acompanhamento Social] ${formData.titulo}`,
            descricao: formData.descricao,
            prioridade: "media",
            status: "aberta",
            prazo_resposta: null,
            solicitada_por: user?.id ?? null,
          });
        }

        if (encaminharPsicossocial) {
          solicitacoesPayload.push({
            jovem_id: formData.jovem_id,
            setor_origem: "servico_social",
            setor_destino: "psicossocial",
            titulo: `[Acompanhamento Social] ${formData.titulo}`,
            descricao: formData.descricao,
            prioridade: "media",
            status: "aberta",
            prazo_resposta: null,
            solicitada_por: user?.id ?? null,
          });
        }

        const { data: solicitacoes, error: solicitacoesError } = await supabase
          .from("solicitacoes_setoriais" as any)
          .insert(solicitacoesPayload)
          .select("id, setor_destino");

        if (solicitacoesError) throw solicitacoesError;

        for (const item of (solicitacoes || []) as Array<{ id: string; setor_destino: string }>) {
          if (item.setor_destino === "pedagogico") {
            solicitacaoIds.pedagogico = item.id;
          }
          if (item.setor_destino === "psicossocial") {
            solicitacaoIds.psicossocial = item.id;
          }
        }

        await supabase
          .from("acompanhamentos_sociais" as any)
          .update({
            solicitacao_pedagogico_id: solicitacaoIds.pedagogico || null,
            solicitacao_psicossocial_id: solicitacaoIds.psicossocial || null,
          })
          .eq("id", acompanhamentoId);
      }

      toast({
        title: "Acompanhamento registrado",
        description:
          encaminharPedagogico || encaminharPsicossocial
            ? "O registro e os encaminhamentos setoriais foram criados."
            : "O registro foi salvo com sucesso.",
      });

      setOpen(false);
      setFormData(buildInitialForm());
      await fetchRecords();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar acompanhamento",
        description: error?.message || "Não foi possível concluir a operação.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title">Acompanhamento Social</h1>
          <p className="page-description">
            Registre acompanhamentos individuais e familiares com encaminhamento direto
            para os demais setores quando necessário.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo registro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo acompanhamento social</DialogTitle>
              <DialogDescription>
                Estruture o registro individual ou familiar e, se precisar, gere o
                encaminhamento setorial no mesmo fluxo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Jovem</Label>
                <Select
                  value={formData.jovem_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, jovem_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o jovem" />
                  </SelectTrigger>
                  <SelectContent>
                    {jovens.map((jovem) => (
                      <SelectItem key={jovem.id} value={jovem.id}>
                        {jovem.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de registro</Label>
                <Select
                  value={formData.tipo_registro}
                  onValueChange={(value: TipoRegistro) =>
                    setFormData((prev) => ({ ...prev, tipo_registro: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="familiar">Familiar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do registro</Label>
                <Input
                  type="datetime-local"
                  value={formData.data_registro}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      data_registro: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, titulo: event.target.value }))
                  }
                  placeholder="Ex.: Atendimento de vulnerabilidade social"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, descricao: event.target.value }))
                  }
                  rows={5}
                  placeholder="Descreva o atendimento, a demanda e os próximos passos."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Contexto familiar</Label>
                <Textarea
                  value={formData.contexto_familiar}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      contexto_familiar: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Use este campo para registrar observações sobre a família quando necessário."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Encaminhamento direto</Label>
                <Select
                  value={formData.encaminhamento_destino}
                  onValueChange={(value: EncaminhamentoDestino) =>
                    setFormData((prev) => ({
                      ...prev,
                      encaminhamento_destino: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    <SelectItem value="pedagogico">Pedagógico</SelectItem>
                    <SelectItem value="psicossocial">Psicossocial</SelectItem>
                    <SelectItem value="ambos">Pedagógico e Psicossocial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar registro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Individuais</CardDescription>
            <CardTitle className="text-2xl">{summary.individual}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Familiares</CardDescription>
            <CardTitle className="text-2xl">{summary.familiar}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Com encaminhamento</CardDescription>
            <CardTitle className="text-2xl">{summary.encaminhados}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Consulte os registros por tipo e pesquise por jovem, título ou conteúdo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Label>Busca</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por jovem, título ou descrição"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={tipoFilter}
              onValueChange={(value: TipoRegistro | "all") => setTipoFilter(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="familiar">Familiar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros de acompanhamento</CardTitle>
          <CardDescription>
            Cada registro fica documentado de forma explícita e pode gerar
            solicitações setoriais quando houver desdobramento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando registros...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Heart className="h-8 w-8" />
              <p>Nenhum acompanhamento encontrado com os filtros atuais.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Jovem</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Encaminhamentos</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.data_registro), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.jovem?.nome_completo || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.jovem?.status || "Sem status"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tipoLabel[item.tipo_registro]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.titulo}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {item.descricao}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {item.encaminhar_pedagogico ? (
                          <Badge variant="outline">Pedagógico</Badge>
                        ) : null}
                        {item.encaminhar_psicossocial ? (
                          <Badge variant="outline">Psicossocial</Badge>
                        ) : null}
                        {!item.encaminhar_pedagogico && !item.encaminhar_psicossocial ? (
                          <span className="text-sm text-muted-foreground">Sem encaminhamento</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        <span>{item.responsavelNome || "—"}</span>
                      </div>
                    </TableCell>
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
