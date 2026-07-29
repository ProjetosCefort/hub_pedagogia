import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Plus } from "lucide-react";
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

type FrequenciaStatus = "presenca" | "falta" | "falta_justificada" | "atraso";

interface FrequenciaRecord {
  id: string;
  data_registro: string;
  status: FrequenciaStatus;
  origem: string;
  observacoes: string | null;
  responsavel_id: string | null;
  responsavelNome?: string | null;
}

const STATUS_LABELS: Record<FrequenciaStatus, string> = {
  presenca: "Presença",
  falta: "Falta",
  falta_justificada: "Falta justificada",
  atraso: "Atraso",
};

interface JovemFrequenciaTabProps {
  jovemId: string;
}

export function JovemFrequenciaTab({ jovemId }: JovemFrequenciaTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<FrequenciaRecord[]>([]);
  const [formData, setFormData] = useState({
    data_registro: new Date().toISOString().slice(0, 10),
    status: "falta" as FrequenciaStatus,
    observacoes: "",
  });

  useEffect(() => {
    fetchRecords();
  }, [jovemId]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("frequencia_jovem" as any)
        .select("id, data_registro, status, origem, observacoes, responsavel_id")
        .eq("jovem_id", jovemId)
        .order("data_registro", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as FrequenciaRecord[];
      const ids = Array.from(new Set(rows.map((row) => row.responsavel_id).filter(Boolean) as string[]));
      const names = new Map<string, string>();

      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", ids);

        profiles?.forEach((profile) => {
          names.set(profile.id, profile.nome_completo || "Usuário");
        });
      }

      setRecords(
        rows.map((row) => ({
          ...row,
          responsavelNome: row.responsavel_id ? names.get(row.responsavel_id) || null : null,
        })),
      );
    } catch (error: any) {
      toast({
        title: "Erro ao carregar frequência",
        description: error.message || "Não foi possível carregar os registros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(
    () => ({
      faltas: records.filter((row) => row.status === "falta").length,
      justificadas: records.filter((row) => row.status === "falta_justificada").length,
      atrasos: records.filter((row) => row.status === "atraso").length,
    }),
    [records],
  );

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("frequencia_jovem" as any).upsert({
        jovem_id: jovemId,
        data_registro: formData.data_registro,
        status: formData.status,
        observacoes: formData.observacoes.trim() || null,
        origem: "manual",
        responsavel_id: user?.id || null,
        created_by: user?.id || null,
      });

      if (error) throw error;

      toast({
        title: "Frequência registrada",
        description: "O histórico de faltas do jovem foi atualizado.",
      });

      setOpen(false);
      setFormData({
        data_registro: new Date().toISOString().slice(0, 10),
        status: "falta",
        observacoes: "",
      });
      await fetchRecords();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar frequência",
        description: error.message || "Não foi possível registrar a frequência.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faltas</CardDescription>
            <CardTitle className="text-2xl">{summary.faltas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Justificadas</CardDescription>
            <CardTitle className="text-2xl">{summary.justificadas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Atrasos</CardDescription>
            <CardTitle className="text-2xl">{summary.atrasos}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Histórico de frequência</CardTitle>
            <CardDescription>Registre faltas e ocorrências de presença do jovem.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo registro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo registro de frequência</DialogTitle>
                <DialogDescription>Este registro passa a alimentar o relatório individual do jovem.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.data_registro}
                    onChange={(event) => setFormData((prev) => ({ ...prev, data_registro: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: FrequenciaStatus) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presenca">Presença</SelectItem>
                      <SelectItem value="falta">Falta</SelectItem>
                      <SelectItem value="falta_justificada">Falta justificada</SelectItem>
                      <SelectItem value="atraso">Atraso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={4}
                    value={formData.observacoes}
                    onChange={(event) => setFormData((prev) => ({ ...prev, observacoes: event.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum registro de frequência encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{format(new Date(row.data_registro), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "falta" ? "destructive" : "secondary"}>
                        {STATUS_LABELS[row.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.observacoes || "—"}</TableCell>
                    <TableCell>{row.responsavelNome || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
