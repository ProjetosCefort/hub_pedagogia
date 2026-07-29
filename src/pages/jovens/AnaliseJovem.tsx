import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Building2,
  BookOpen,
  Heart,
  FileCheck,
  AlertTriangle,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ClipboardCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatCpf, formatDateOnly, formatPhone } from "@/lib/formatters";

interface Inscricao {
  id: string;
  cpf: string;
  email: string;
  nome_completo: string | null;
  nome_social: string | null;
  status: string;
  current_step: number;
  data_nascimento: string | null;
  sexo: string | null;
  raca: string | null;
  contato_1: string | null;
  contato_2: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  esta_estudando: boolean | null;
  periodo_estudo: string | null;
  nivel_educacao: string | null;
  e_pcd: boolean | null;
  nivel_pcd: string | null;
  descricao_pcd: string | null;
  laudo_medico_url: string | null;
  renda_familiar: number | null;
  quantidade_membros: number | null;
  tipo_moradia: string | null;
  situacao_moradia: string | null;
  possui_saneamento: boolean | null;
  possui_energia: boolean | null;
  possui_deficiencia: boolean | null;
  descricao_deficiencia: string | null;
  possui_doenca_cronica: boolean | null;
  descricao_doenca: string | null;
  recebe_beneficio: boolean | null;
  descricao_beneficio: string | null;
  participa_programa_social: boolean | null;
  descricao_programa: string | null;
  pis_pasep: string | null;
  tem_ctps_digital: boolean | null;
  numero_ctps: string | null;
  unidade_preferencia: string | null;
  empresa_id: string | null;
  turma_id: string | null;
  empresa: { nome_fantasia: string | null; razao_social: string } | null;
  turma: { nome: string } | null;
  notas_internas: string | null;
  step1_completed_at: string | null;
  step2_completed_at: string | null;
  step3_completed_at: string | null;
  completion_percentage: number | null;
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  completed: "Completo",
  talent_bank: "Banco de Talentos",
  under_analysis: "Em Análise",
  approved: "Aprovado",
  active_apprentice: "Aprendiz Ativo",
  rejected: "Rejeitado",
};

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

function unidadePreferenciaLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    belo_horizonte: "Belo Horizonte - Avenida Afonso Pena, n 867 - Centro - BH",
    contagem: "Contagem - Av. José Faria da Rocha, 5566 - Eldorado",
  };

  if (!value) return null;
  return labels[value] || value;
}

export default function AnaliseJovem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inscricao, setInscricao] = useState<Inscricao | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [complementarDialogOpen, setComplementarDialogOpen] = useState(false);
  const [complementarMotivo, setComplementarMotivo] = useState("");

  useEffect(() => {
    if (id) fetchInscricao();
  }, [id]);

  async function fetchInscricao() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select(
          `
          *,
          completion_percentage:calculate_inscricao_completion,
          empresa:empresas(nome_fantasia, razao_social),
          turma:turmas(nome)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setInscricao(data as Inscricao);
      } else {
        setInscricao(null);
      }
    } catch (err: any) {
      console.error("Erro ao carregar inscrição:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do candidato",
        variant: "destructive",
      });
      setInscricao(null);
    } finally {
      setLoading(false);
    }
  }

  const completion = inscricao?.completion_percentage ?? 0;
  const cadastroCompleto = completion >= 80;
  const socioeconomicoRealizado = !!(
    inscricao?.step3_completed_at && inscricao?.renda_familiar != null
  );
  const pedagogicoRealizado = false; // Não aplicável para inscrições pré-migração
  const empresaDefinida = !!(inscricao?.empresa_id || inscricao?.empresa);
  const checklistOk =
    cadastroCompleto && socioeconomicoRealizado && (empresaDefinida || true); // Empresa opcional na aprovação

  async function handleSolicitarComplementacao() {
    if (!inscricao) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("change_inscricao_status", {
        p_inscricao_id: inscricao.id,
        p_new_status: "talent_bank",
        p_motivo: complementarMotivo || "Solicitação de complementação",
        p_observacao: complementarMotivo || null,
        p_origem: "analise",
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação de complementação registrada.",
      });
      setComplementarDialogOpen(false);
      setComplementarMotivo("");
      navigate("/jovens/gestao");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível registrar",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inscricao) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Candidato não encontrado.</p>
        <Button variant="outline" asChild>
          <Link to="/jovens/gestao">Voltar à Gestão</Link>
        </Button>
      </div>
    );
  }

  const podeDecidir = !["approved", "active_apprentice", "rejected"].includes(
    inscricao.status,
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/jovens/gestao">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="page-title">Modo Análise do Jovem</h1>
            <p className="page-description text-muted-foreground mt-0.5">
              Revisão e decisão sobre o candidato
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {statusLabels[inscricao.status] || inscricao.status}
        </Badge>
      </div>

      {/* Checklist */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Checklist de Análise
          </CardTitle>
          <CardDescription>
            Verifique os itens antes de tomar a decisão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80">
              <Checkbox checked={cadastroCompleto} disabled />
              <div>
                <p className="font-medium text-sm">Cadastro completo?</p>
                <p className="text-xs text-muted-foreground">
                  {cadastroCompleto ? "Sim" : "Não"} — {completion}% preenchido
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80">
              <Checkbox checked={socioeconomicoRealizado} disabled />
              <div>
                <p className="font-medium text-sm">
                  Avaliação socioeconômica realizada?
                </p>
                <p className="text-xs text-muted-foreground">
                  {socioeconomicoRealizado ? "Sim — Step 3 concluído" : "Não"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80">
              <Checkbox checked={pedagogicoRealizado} disabled />
              <div>
                <p className="font-medium text-sm">
                  Avaliação pedagógica realizada?
                </p>
                <p className="text-xs text-muted-foreground">
                  N/A — Aplicável após migração para jovem
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80">
              <Checkbox checked={empresaDefinida} disabled />
              <div>
                <p className="font-medium text-sm">
                  Empresa definida? (se aplicável)
                </p>
                <p className="text-xs text-muted-foreground">
                  {empresaDefinida
                    ? inscricao.empresa?.nome_fantasia ||
                      inscricao.empresa?.razao_social ||
                      "Sim"
                    : "Não"}
                </p>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Completude dos documentos
            </p>
            <Progress value={completion} className="w-32" />
            <span className="text-sm font-medium w-10">{completion}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Dados */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="Nome completo"
              value={inscricao.nome_completo}
              icon={<User className="w-4 h-4" />}
            />
            <InfoRow label="Nome social" value={inscricao.nome_social} />
            <InfoRow
              label="CPF"
              value={inscricao.cpf ? formatCpf(inscricao.cpf) : null}
            />
            <InfoRow
              label="Data de nascimento"
              value={formatDateOnly(inscricao.data_nascimento) || null}
              icon={<Calendar className="w-4 h-4" />}
            />
            <InfoRow label="Sexo" value={inscricao.sexo} />
            <InfoRow label="Raça/Cor" value={inscricao.raca} />
            <InfoRow
              label="Email"
              value={inscricao.email}
              icon={<Mail className="w-4 h-4" />}
            />
            <InfoRow
              label="Contato 1"
              value={
                inscricao.contato_1 ? formatPhone(inscricao.contato_1) : null
              }
              icon={<Phone className="w-4 h-4" />}
            />
            <InfoRow
              label="Contato 2"
              value={
                inscricao.contato_2 ? formatPhone(inscricao.contato_2) : null
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="CEP" value={inscricao.cep} />
            <InfoRow label="Logradouro" value={inscricao.logradouro} />
            <InfoRow label="Número" value={inscricao.numero} />
            <InfoRow label="Complemento" value={inscricao.complemento} />
            <InfoRow label="Bairro" value={inscricao.bairro} />
            <InfoRow
              label="Cidade / Estado"
              value={[inscricao.cidade, inscricao.estado]
                .filter(Boolean)
                .join(" — ")}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Situação Escolar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="Está estudando?"
              value={inscricao.esta_estudando ? "Sim" : "Não"}
            />
            <InfoRow
              label="Período de estudo"
              value={inscricao.periodo_estudo}
            />
            <InfoRow
              label="Nível de educação"
              value={inscricao.nivel_educacao}
            />
            <InfoRow
              label="Unidade de preferência"
              value={unidadePreferenciaLabel(inscricao.unidade_preferencia)}
              icon={<MapPin className="w-4 h-4" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              PCD e Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="É PCD?" value={inscricao.e_pcd ? "Sim" : "Não"} />
            {inscricao.e_pcd && (
              <>
                <InfoRow label="Nível PCD" value={inscricao.nivel_pcd} />
                <InfoRow label="Descrição" value={inscricao.descricao_pcd} />
                <InfoRow
                  label="Laudo médico"
                  value={inscricao.laudo_medico_url ? "Anexado" : "Não anexado"}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Dados Socioeconômicos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow
            label="Renda familiar"
            value={
              inscricao.renda_familiar != null
                ? `R$ ${Number(inscricao.renda_familiar).toFixed(2)}`
                : null
            }
          />
          <InfoRow
            label="Quantidade de membros"
            value={inscricao.quantidade_membros?.toString() ?? null}
          />
          <InfoRow label="Tipo de moradia" value={inscricao.tipo_moradia} />
          <InfoRow
            label="Situação da moradia"
            value={inscricao.situacao_moradia}
          />
          <InfoRow
            label="Possui saneamento?"
            value={
              inscricao.possui_saneamento != null
                ? inscricao.possui_saneamento
                  ? "Sim"
                  : "Não"
                : null
            }
          />
          <InfoRow
            label="Possui energia?"
            value={
              inscricao.possui_energia != null
                ? inscricao.possui_energia
                  ? "Sim"
                  : "Não"
                : null
            }
          />
          <InfoRow
            label="Possui deficiência?"
            value={
              inscricao.possui_deficiencia != null
                ? inscricao.possui_deficiencia
                  ? "Sim"
                  : "Não"
                : null
            }
          />
          {inscricao.possui_deficiencia && (
            <InfoRow
              label="Descrição deficiência"
              value={inscricao.descricao_deficiencia}
            />
          )}
          <InfoRow
            label="Possui doença crônica?"
            value={
              inscricao.possui_doenca_cronica != null
                ? inscricao.possui_doenca_cronica
                  ? "Sim"
                  : "Não"
                : null
            }
          />
          {inscricao.possui_doenca_cronica && (
            <InfoRow
              label="Descrição doença"
              value={inscricao.descricao_doenca}
            />
          )}
          <InfoRow
            label="Recebe benefício?"
            value={
              inscricao.recebe_beneficio != null
                ? inscricao.recebe_beneficio
                  ? "Sim"
                  : "Não"
                : null
            }
          />
          {inscricao.recebe_beneficio && (
            <InfoRow
              label="Descrição benefício"
              value={inscricao.descricao_beneficio}
            />
          )}
          <InfoRow
            label="Participa de programa social?"
            value={
              inscricao.participa_programa_social != null
                ? inscricao.participa_programa_social
                  ? "Sim"
                  : "Não"
                : null
            }
          />
          {inscricao.participa_programa_social && (
            <InfoRow
              label="Descrição programa"
              value={inscricao.descricao_programa}
            />
          )}
        </CardContent>
      </Card>

      {inscricao.empresa && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Empresa e Turma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="Empresa"
              value={
                inscricao.empresa?.nome_fantasia ||
                inscricao.empresa?.razao_social
              }
              icon={<Building2 className="w-4 h-4" />}
            />
            <InfoRow
              label="Turma"
              value={inscricao.turma?.nome ?? null}
              icon={<GraduationCap className="w-4 h-4" />}
            />
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      {podeDecidir && (
        <Card className="border-t-2 border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Decisão</CardTitle>
            <CardDescription>Escolha uma ação para o candidato</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setComplementarDialogOpen(true)}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Solicitar complementação
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/jovens/gestao">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar sem alterar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!podeDecidir && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground text-center">
              Este candidato já teve decisão tomada (status:{" "}
              {statusLabels[inscricao.status]}).
            </p>
            <div className="flex justify-center mt-4">
              <Button asChild>
                <Link to="/jovens/gestao">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar à Gestão
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog
        open={complementarDialogOpen}
        onOpenChange={setComplementarDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar complementação</DialogTitle>
            <DialogDescription>
              O candidato será mantido no Banco de Talentos. Informe quais dados
              precisam ser complementados (opcional).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Motivo / itens a complementar</Label>
            <Textarea
              value={complementarMotivo}
              onChange={(e) => setComplementarMotivo(e.target.value)}
              placeholder="Ex.: Documentos de CTPS, laudo médico para PCD..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setComplementarDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSolicitarComplementacao}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
