import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Search,
  RefreshCcw,
  Filter,
  ChevronDown,
  Eye,
  CheckCircle2,
  Clock,
  UserCheck,
  Users,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  GraduationCap,
  Edit,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Copy,
  ClipboardCheck,
  Loader2,
  Mail,
  MessageCircle,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { formatCpf, formatDateOnly } from "@/lib/formatters";
import { InscricaoStatusHistoryDialog } from "@/components/jovens/InscricaoStatusHistoryDialog";
import { sendDocumentsUploadLinkEmail } from "@/lib/email";

interface Inscricao {
  id: string;
  cpf: string;
  email: string;
  nome_completo: string | null;
  status:
    | "draft"
    | "completed"
    | "talent_bank"
    | "under_analysis"
    | "approved"
    | "active_apprentice"
    | "rejected";
  current_step: number;
  data_nascimento: string | null;
  sexo?: string | null;
  contato_1: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  regiao_metropolitana?: boolean | null;
  periodo_estudo?: string | null;
  created_at: string;
  completed_at: string | null;
  data_aprovacao: string | null;
  data_contrato: string | null;
  jovem_id: string | null;
  empresa: { nome_fantasia: string | null; endereco?: string | null } | null;
  turma: { nome: string } | null;
  completion_percentage?: number;
}

interface InscricaoNota {
  id: string;
  inscricao_id: string;
  jovem_id: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
  createdByName?: string;
  createdByCargo?: string | null;
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: LucideIcon;
  }
> = {
  draft: { label: "Rascunho", variant: "outline", icon: FileText },
  completed: { label: "Completo", variant: "secondary", icon: CheckCircle2 },
  talent_bank: { label: "Banco de Talentos", variant: "default", icon: Users },
  under_analysis: { label: "Em Análise", variant: "secondary", icon: Clock },
  approved: { label: "Aprovado", variant: "default", icon: UserCheck },
  active_apprentice: {
    label: "Aprendiz Ativo",
    variant: "default",
    icon: CheckCircle2,
  },
  rejected: { label: "Rejeitado", variant: "destructive", icon: AlertCircle },
};

export default function GestaoJovensAprendizes() {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(
    null,
  );
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");
  const [statusObservation, setStatusObservation] = useState("");
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<InscricaoNota[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSubmitting, setNotesSubmitting] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("banco-talentos");
  const [deleteTarget, setDeleteTarget] = useState<Inscricao | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCadastro, setDeletingCadastro] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bancoTalentosCount, setBancoTalentosCount] = useState(0);
  const [emAnaliseCount, setEmAnaliseCount] = useState(0);
  const [aprovadosCount, setAprovadosCount] = useState(0);
  /** Mapa CPF (apenas dígitos) -> jovem_id para inscrições que ainda não têm jovem_id preenchido */
  const [jovemIdByCpf, setJovemIdByCpf] = useState<Record<string, string>>({});
  const [vagaStatusByInscricao, setVagaStatusByInscricao] = useState<
    Record<string, string>
  >({});
  const [localidadeFilter, setLocalidadeFilter] = useState<"all" | "compativel">("all");
  const [cidadeFilter, setCidadeFilter] = useState("");
  const [bairroFilter, setBairroFilter] = useState("");
  const [idadeMin, setIdadeMin] = useState("");
  const [idadeMax, setIdadeMax] = useState("");
  const [sexoFilter, setSexoFilter] = useState("all");
  const [horarioTrabalhoFilter, setHorarioTrabalhoFilter] = useState<
    "all" | "manha" | "tarde" | "noite" | "integral"
  >("all");
  const [dataInscricaoInicio, setDataInscricaoInicio] = useState("");
  const [dataInscricaoFim, setDataInscricaoFim] = useState("");
  const [emailSendingForInscricaoId, setEmailSendingForInscricaoId] = useState<string | null>(null);
  const { toast } = useToast();

  const documentosUploadUrl = `${window.location.origin}/acesso-jovem`;
  const documentosObrigatoriosFormatado =
    "RG (Frente e verso), CPF, Comprovante de endereço, Comprovante de escolaridade/matrícula, Carteira de trabalho";

  const activeBancoTalentosFiltersCount = [
    localidadeFilter !== "all",
    Boolean(cidadeFilter),
    Boolean(bairroFilter),
    Boolean(idadeMin),
    Boolean(idadeMax),
    sexoFilter !== "all",
    horarioTrabalhoFilter !== "all",
    Boolean(dataInscricaoInicio),
    Boolean(dataInscricaoFim),
  ].filter(Boolean).length;

  const clearBancoTalentosFilters = () => {
    setLocalidadeFilter("all");
    setCidadeFilter("");
    setBairroFilter("");
    setIdadeMin("");
    setIdadeMax("");
    setSexoFilter("all");
    setHorarioTrabalhoFilter("all");
    setDataInscricaoInicio("");
    setDataInscricaoFim("");
  };

  const normalizeCpf = (cpf: string | null | undefined) =>
    cpf ? cpf.replace(/\D/g, "") : "";

  useEffect(() => {
    fetchInscricoes();
    fetchCounts();
  }, [activeTab]);

  // Buscar contadores separadamente para não depender do filtro da aba ativa
  async function fetchCounts() {
    try {
      // Banco de talentos (exclui em análise)
      const { count: bancoCount } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("*", { count: "exact", head: true })
        .in("status", ["draft", "completed", "talent_bank"]);

      // Em análise
      const { count: emAnaliseCountRes } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("*", { count: "exact", head: true })
        .eq("status", "under_analysis");

      // Aprovados e aprendizes ativos
      const { count: aprovadosCountRes } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("*", { count: "exact", head: true })
        .in("status", ["approved", "active_apprentice"]);

      setBancoTalentosCount(bancoCount || 0);
      setEmAnaliseCount(emAnaliseCountRes || 0);
      setAprovadosCount(aprovadosCountRes || 0);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  }

  async function fetchInscricoes() {
    setLoading(true);
    try {
      let query = supabase
        .from("inscricoes_jovens_aprendizes")
        .select(
          `
          *,
          completion_percentage:calculate_inscricao_completion,
          empresa:empresas(nome_fantasia, endereco),
          turma:turmas(nome)
        `,
        )
        .order("created_at", { ascending: false });

      // Filtrar por tab ativa
      if (activeTab === "banco-talentos") {
        query = query.in("status", ["draft", "completed", "talent_bank"]);
      } else if (activeTab === "em-analise") {
        query = query.eq("status", "under_analysis");
      } else {
        // Aprovados e aprendizes ativos
        query = query.in("status", ["approved", "active_apprentice"]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Query error:", error);
        throw error;
      }

      const list = (data as Inscricao[]) || [];
      setInscricoes(list);
      const inscricaoIds = list.map((item) => item.id).filter(Boolean);

      if (inscricaoIds.length > 0) {
        const { data: vinculos } = await supabase
          .from("jovem_vaga_vinculos")
          .select("inscricao_id, status, created_at")
          .in("inscricao_id", inscricaoIds)
          .order("created_at", { ascending: false });

        const map: Record<string, string> = {};
        (vinculos || []).forEach((v) => {
          if (v.inscricao_id && !map[v.inscricao_id]) {
            map[v.inscricao_id] = v.status;
          }
        });
        setVagaStatusByInscricao(map);
      } else {
        setVagaStatusByInscricao({});
      }

      // Na aba aprovados, resolver jovem_id por CPF para quem ainda não tem vínculo
      if (activeTab === "aprovados" && list.length > 0) {
        const cpfsNeeded = [
          ...new Set(
            list
              .filter((i) => !i.jovem_id && i.cpf)
              .map((i) => i.cpf!.replace(/\D/g, "")),
          ),
        ];
        if (cpfsNeeded.length > 0) {
          const { data: jovens } = await supabase
            .from("jovens")
            .select("id, cpf")
            .not("cpf", "is", null);
          const map: Record<string, string> = {};
          (jovens || []).forEach((j: { id: string; cpf: string | null }) => {
            const key = j.cpf ? j.cpf.replace(/\D/g, "") : "";
            if (key && cpfsNeeded.includes(key)) map[key] = j.id;
          });
          setJovemIdByCpf(map);
        } else {
          setJovemIdByCpf({});
        }
      } else {
        setJovemIdByCpf({});
      }
    } catch (error: unknown) {
      console.error("Error fetching inscricoes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as inscrições",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function calculateAge(birthDate: string | null): number | null {
    if (!birthDate) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate).slice(0, 10));
    const birth = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  }

  function normalizePeriod(value: string | null | undefined): "manha" | "tarde" | "noite" | "integral" | null {
    if (!value) return null;
    const normalized = value.toLowerCase();
    if (normalized.includes("integral")) return "integral";
    if (normalized.includes("matut") || normalized.includes("manh")) return "manha";
    if (normalized.includes("vespert") || normalized.includes("tarde")) return "tarde";
    if (normalized.includes("noturn") || normalized.includes("noite")) return "noite";
    return null;
  }

  function normalizeText(value: string | null | undefined): string {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function isLocalidadeCompativel(inscricao: Inscricao): boolean {
    // Regra prática no front:
    // - Se o candidato está em região metropolitana => compatível.
    // - Fora da região metropolitana => exige cidade do candidato constar no endereço da empresa.
    const cidadeCandidato = (inscricao.cidade || "").trim().toLowerCase();
    const enderecoEmpresa = (inscricao.empresa?.endereco || "").trim().toLowerCase();

    if (inscricao.regiao_metropolitana) return true;
    if (!cidadeCandidato || !enderecoEmpresa) return false;

    return enderecoEmpresa.includes(cidadeCandidato);
  }

  function parseDateFilter(value: string, endOfDay = false): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    );
  }

  function isWithinInscricaoDateRange(inscricaoDate: string): boolean {
    if (!dataInscricaoInicio && !dataInscricaoFim) return true;

    const createdAt = new Date(inscricaoDate);
    if (Number.isNaN(createdAt.getTime())) return false;

    const startDate = parseDateFilter(dataInscricaoInicio);
    const endDate = parseDateFilter(dataInscricaoFim, true);

    if (startDate && createdAt < startDate) return false;
    if (endDate && createdAt > endDate) return false;

    return true;
  }

  function renderVagaBadge(inscricaoId: string) {
    const status = vagaStatusByInscricao[inscricaoId];
    if (!status) return null;

    if (status === "em_analise") {
      return (
        <Badge variant="outline" className="mt-1 text-xs border-blue-300 text-blue-700">
          Em análise para vaga
        </Badge>
      );
    }

    const label =
      status === "aprovado"
        ? "Vaga aprovada"
        : status === "reprovado"
          ? "Vaga reprovada"
          : "Vaga encerrada";

    return (
      <Badge variant="outline" className="mt-1 text-xs">
        {label}
      </Badge>
    );
  }

  async function handleStatusChange() {
    if (!selectedInscricao || !newStatus) return;
    if (newStatus === "rejected" && !statusReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo para reprovar a inscrição.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc("change_inscricao_status", {
        p_inscricao_id: selectedInscricao.id,
        p_new_status: newStatus,
        p_motivo: statusReason || null,
        p_observacao: statusObservation || null,
        p_origem: "gestao",
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
      });

      setStatusDialogOpen(false);
      setNewStatus("");
      setStatusReason("");
      setStatusObservation("");
      await fetchCounts();
      fetchInscricoes();
      setActiveTab("banco-talentos");
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  }

  async function fetchNotes(inscricaoId: string) {
    setNotesLoading(true);
    try {
      const { data, error } = await supabase
        .from("inscricao_notas_internas")
        .select("*")
        .eq("inscricao_id", inscricaoId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const notesData = (data || []) as InscricaoNota[];
      const userIds = Array.from(
        new Set(notesData.map((note) => note.created_by).filter(Boolean) as string[]),
      );
      const profilesMap = new Map<
        string,
        { nome_completo: string; cargo: string | null }
      >();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo, cargo")
          .in("id", userIds);

        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, {
            nome_completo: profile.nome_completo,
            cargo: profile.cargo,
          });
        });
      }

      setNotes(
        notesData.map((note) => {
          const profile = note.created_by ? profilesMap.get(note.created_by) : null;
          return {
            ...note,
            createdByName: profile?.nome_completo || "Sistema",
            createdByCargo: profile?.cargo || null,
          };
        }),
      );
    } catch (error: unknown) {
      console.error("Error fetching notes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de notas.",
        variant: "destructive",
      });
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }

  async function handleSaveNotes() {
    if (!selectedInscricao || !noteText.trim()) return;

    try {
      setNotesSubmitting(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("inscricao_notas_internas")
        .insert({
          inscricao_id: selectedInscricao.id,
          jovem_id: selectedInscricao.jovem_id,
          note: noteText.trim(),
          created_by: user?.id ?? null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Comentário adicionado ao histórico.",
      });

      setNoteText("");
      await fetchNotes(selectedInscricao.id);
    } catch (error: unknown) {
      console.error("Error saving notes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
        variant: "destructive",
      });
    } finally {
      setNotesSubmitting(false);
    }
  }

  async function handleDeleteCadastro() {
    if (!deleteTarget) return;

    setDeletingCadastro(true);
    try {
      const { error } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      toast({
        title: "Cadastro excluído",
        description: "O cadastro foi removido do Banco de Talentos.",
      });

      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await fetchCounts();
      await fetchInscricoes();
    } catch (error: unknown) {
      console.error("Error deleting inscricao:", error);
      toast({
        title: "Erro",
        description: getErrorMessage(error, "Não foi possível excluir o cadastro."),
        variant: "destructive",
      });
    } finally {
      setDeletingCadastro(false);
    }
  }

  async function handleMigrateToJovem(inscricao?: Inscricao) {
    const inscricaoToMigrate = inscricao || selectedInscricao;
    if (!inscricaoToMigrate) return;

    // Migração para /jovens só é permitida quando o status da inscrição é "Aprovado"
    if (inscricaoToMigrate.status !== "approved") {
      toast({
        title: "Migração não permitida",
        description:
          "A migração para a lista de jovens só pode ser feita quando o status for 'Aprovado'. Altere o status para Aprovado e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc("migrate_inscricao_to_jovem", {
        inscricao_id: inscricaoToMigrate.id,
      });

      if (error) throw error;

      const readableStatus =
        statusConfig[inscricaoToMigrate.status]?.label ||
        inscricaoToMigrate.status;
      const willRemainPending = !inscricaoToMigrate.data_contrato;

      toast({
        title: "Sucesso",
        description: willRemainPending
          ? `Jovem migrado. O status permanece como "${readableStatus}" até registrar a data de contrato ou atualizar pelo prontuário.`
          : "Jovem migrado para o sistema principal!",
      });

      fetchInscricoes();
    } catch (error: unknown) {
      console.error("Error migrating to jovem:", error);
      const errorDetails =
        error && typeof error === "object"
          ? (error as { code?: unknown; message?: unknown })
          : null;
      const friendlyMessage =
        errorDetails?.code === "22P02"
          ? "Status do jovem está desatualizado. Atualize a página e aguarde a migração automática para aprovados."
          : getErrorMessage(error, "Não foi possível migrar para jovem");
      toast({
        title: "Erro",
        description: friendlyMessage,
        variant: "destructive",
      });
    }
  }

  const filteredInscricoes = inscricoes.filter((inscricao) => {
    if (!searchTerm) return true; // Se não há busca, mostra todos

    const searchLower = searchTerm.toLowerCase();
    const searchMatches = (
      inscricao.nome_completo?.toLowerCase().includes(searchLower) ||
      (inscricao.cpf && inscricao.cpf.includes(searchTerm)) ||
      inscricao.email?.toLowerCase().includes(searchLower) ||
      (inscricao.id && inscricao.id.toLowerCase().includes(searchLower))
    );

    return searchMatches;
  }).filter((inscricao) => {
    // Filtros avançados aplicam-se somente ao banco de talentos.
    if (activeTab !== "banco-talentos") return true;

    if (localidadeFilter === "compativel" && !isLocalidadeCompativel(inscricao)) {
      return false;
    }

    const cidadeTerm = normalizeText(cidadeFilter);
    if (cidadeTerm && !normalizeText(inscricao.cidade).includes(cidadeTerm)) {
      return false;
    }

    const bairroTerm = normalizeText(bairroFilter);
    if (bairroTerm && !normalizeText(inscricao.bairro).includes(bairroTerm)) {
      return false;
    }

    const idade = calculateAge(inscricao.data_nascimento);
    const idadeMinNum = idadeMin ? Number(idadeMin) : null;
    const idadeMaxNum = idadeMax ? Number(idadeMax) : null;

    if (idadeMinNum !== null && !Number.isNaN(idadeMinNum)) {
      if (idade === null || idade < idadeMinNum) return false;
    }
    if (idadeMaxNum !== null && !Number.isNaN(idadeMaxNum)) {
      if (idade === null || idade > idadeMaxNum) return false;
    }

    if (sexoFilter !== "all") {
      const sexo = (inscricao.sexo || "").toLowerCase();
      if (!sexo.includes(sexoFilter)) return false;
    }

    if (horarioTrabalhoFilter !== "all") {
      const periodo = normalizePeriod(inscricao.periodo_estudo);
      if (periodo !== horarioTrabalhoFilter) return false;
    }

    if (!isWithinInscricaoDateRange(inscricao.created_at)) {
      return false;
    }

    return true;
  });

  const inscricaoUrl = `${window.location.origin}/inscricao`;

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(inscricaoUrl);
    toast({
      title: "Link copiado!",
      description:
        "O link de inscrição foi copiado para a área de transferência",
    });
  };

  const copyDocumentosLinkToClipboard = () => {
    navigator.clipboard.writeText(documentosUploadUrl);
    toast({
      title: "Link copiado!",
      description: "O link para upload de documentos foi copiado.",
    });
  };

  async function handleSendUploadLinkByEmail(inscricao: Inscricao) {
    if (!inscricao.email) {
      toast({
        title: "E-mail não informado",
        description: "Não foi possível enviar o link sem e-mail cadastrado.",
        variant: "destructive",
      });
      return;
    }

    setEmailSendingForInscricaoId(inscricao.id);
    try {
      const ok = await sendDocumentsUploadLinkEmail({
        email: inscricao.email,
        nome: inscricao.nome_completo || "Jovem",
        link: documentosUploadUrl,
        documentos: documentosObrigatoriosFormatado,
      });

      if (!ok) {
        throw new Error("Falha ao enviar e-mail");
      }

      toast({
        title: "E-mail enviado",
        description: "Link de upload de documentos enviado com sucesso.",
      });
    } catch {
      toast({
        title: "Falha no envio",
        description: "Não foi possível enviar o e-mail de solicitação de documentos.",
        variant: "destructive",
      });
    } finally {
      setEmailSendingForInscricaoId(null);
    }
  }

  function handleSendUploadLinkByWhatsApp(inscricao: Inscricao) {
    const telefone = (inscricao.contato_1 || "").replace(/\D/g, "");
    if (!telefone) {
      toast({
        title: "Telefone não informado",
        description: "Não foi possível abrir o WhatsApp sem telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }

    const nome = inscricao.nome_completo || "jovem";
    const mensagem = [
      `Olá, ${nome}!`,
      "Segue o link para envio dos documentos do processo de Jovem Aprendiz:",
      documentosUploadUrl,
      "",
      "Documentos solicitados:",
      "1. RG (frente e verso)",
      "2. CPF",
      "3. Comprovante de endereço",
      "4. Comprovante de escolaridade/matrícula",
      "5. Carteira de trabalho",
    ].join("\n");

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Banco de Talentos</h1>
          <p className="page-description">
            Gerencie inscrições públicas e acompanhe o ciclo completo dos
            aprendizes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchInscricoes();
              fetchCounts();
            }}
            disabled={loading}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Link de Inscrição Externa */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Link de Inscrição Pública
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Compartilhe este link para que jovens aprendizes possam se cadastrar no
                  banco de talentos
                </p>
                <code className="text-xs bg-white/50 dark:bg-black/30 px-2 py-1 rounded mt-2 inline-block text-blue-800 dark:text-blue-200">
                  {inscricaoUrl}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLinkToClipboard}
                className="border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
              <Button
                size="sm"
                asChild
                className="bg-blue-600 hover:bg-blue-700"
              >
                <a href="/inscricao" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Página
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Link de Upload de Documentos
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Use este link para o jovem acessar e anexar: RG, CPF, comprovante de endereço, comprovante de escolaridade/matrícula e carteira de trabalho.
                </p>
                <code className="text-xs bg-white/50 dark:bg-black/30 px-2 py-1 rounded mt-2 inline-block text-emerald-800 dark:text-emerald-200">
                  {documentosUploadUrl}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={copyDocumentosLinkToClipboard}
                className="border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
              <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700">
                <a href="/acesso-jovem" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Página
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Banco de Talentos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bancoTalentosCount}</div>
            <p className="text-xs text-muted-foreground">
              Rascunho, completo e banco de talentos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emAnaliseCount}</div>
            <p className="text-xs text-muted-foreground">
              Sendo analisados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aprovadosCount}</div>
            <p className="text-xs text-muted-foreground">
              Aprovados e aprendizes ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {activeTab === "banco-talentos" && (
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <Card className="filters-panel">
              <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros do Banco de Talentos
                  {activeBancoTalentosFiltersCount > 0 && (
                    <Badge variant="secondary">
                      {activeBancoTalentosFiltersCount}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {activeBancoTalentosFiltersCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearBancoTalentosFilters}
                    >
                      Limpar
                    </Button>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      {filtersOpen ? "Ocultar" : "Exibir"}
                      <ChevronDown
                        className={`ml-2 h-4 w-4 transition-transform ${
                          filtersOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="space-y-5 pt-0">
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold">Localização</h3>
                    <div className="filters-grid-compact">
                      <div className="space-y-1.5">
                        <Label>Localidade</Label>
                        <Select
                          value={localidadeFilter}
                          onValueChange={(value) =>
                            setLocalidadeFilter(value as "all" | "compativel")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="compativel">
                              Compatível com empresa
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Cidade</Label>
                        <Input
                          value={cidadeFilter}
                          onChange={(e) => setCidadeFilter(e.target.value)}
                          placeholder="Ex.: Fortaleza"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Bairro</Label>
                        <Input
                          value={bairroFilter}
                          onChange={(e) => setBairroFilter(e.target.value)}
                          placeholder="Ex.: Centro"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3 border-t pt-4">
                    <h3 className="text-sm font-semibold">Perfil</h3>
                    <div className="filters-grid-compact">
                      <div className="space-y-1.5">
                        <Label>Idade mínima</Label>
                        <Input
                          type="number"
                          min={0}
                          value={idadeMin}
                          onChange={(e) => setIdadeMin(e.target.value)}
                          placeholder="Ex.: 14"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Idade máxima</Label>
                        <Input
                          type="number"
                          min={0}
                          value={idadeMax}
                          onChange={(e) => setIdadeMax(e.target.value)}
                          placeholder="Ex.: 24"
                        />
                      </div>

                      <div className="space-y-1.5">
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
                    </div>
                  </section>

                  <section className="space-y-3 border-t pt-4">
                    <h3 className="text-sm font-semibold">
                      Inscrição e disponibilidade
                    </h3>
                    <div className="filters-grid-compact">
                      <div className="space-y-1.5">
                        <Label>Horário de trabalho</Label>
                        <Select
                          value={horarioTrabalhoFilter}
                          onValueChange={(value) =>
                            setHorarioTrabalhoFilter(
                              value as
                                | "all"
                                | "manha"
                                | "tarde"
                                | "noite"
                                | "integral",
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="manha">Manhã</SelectItem>
                            <SelectItem value="tarde">Tarde</SelectItem>
                            <SelectItem value="noite">Noite</SelectItem>
                            <SelectItem value="integral">Integral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Inscrição de</Label>
                        <Input
                          type="date"
                          value={dataInscricaoInicio}
                          onChange={(e) =>
                            setDataInscricaoInicio(e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Inscrição até</Label>
                        <Input
                          type="date"
                          value={dataInscricaoFim}
                          onChange={(e) => setDataInscricaoFim(e.target.value)}
                        />
                      </div>
                    </div>
                  </section>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <div className="space-y-4">
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Data Inscrição</TableHead>
                  <TableHead className="w-[210px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="animate-pulse-soft text-muted-foreground">
                        Carregando...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInscricoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Nenhuma inscrição encontrada
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInscricoes.map((inscricao) => {
                    const StatusIcon =
                      statusConfig[inscricao.status]?.icon || AlertCircle;
                    return (
                      <TableRow key={inscricao.id}>
                        <TableCell className="font-medium">
                          {inscricao.nome_completo || "—"}
                          {renderVagaBadge(inscricao.id)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inscricao.cpf ? formatCpf(inscricao.cpf) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inscricao.email || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              statusConfig[inscricao.status]?.variant ||
                              "outline"
                            }
                            className="flex items-center gap-1 w-fit"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[inscricao.status]?.label ||
                              inscricao.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 w-24">
                            <Progress
                              value={inscricao.completion_percentage || 0}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-8">
                              {inscricao.completion_percentage || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inscricao.created_at
                            ? format(
                                new Date(inscricao.created_at),
                                "dd/MM/yyyy",
                                {
                                  locale: ptBR,
                                },
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Analisar"
                              className="text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                            >
                              <Link
                                to={`/jovens/gestao/analise/${inscricao.id}`}
                              >
                                <ClipboardCheck className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedInscricao(inscricao);
                                setViewDialogOpen(true);
                              }}
                              title="Ver detalhes"
                              className="text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(inscricao);
                                setDeleteDialogOpen(true);
                              }}
                              title="Excluir Cadastro"
                              className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir Cadastro
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* View Inscricao Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Inscrição</DialogTitle>
            <DialogDescription>
              Visualização completa dos dados da inscrição
            </DialogDescription>
          </DialogHeader>
          {selectedInscricao && (
            <InscricaoDetails inscricao={selectedInscricao} />
          )}
          <DialogFooter>
            <div className="flex flex-wrap gap-2 w-full justify-end">
              {selectedInscricao &&
                selectedInscricao.status !== "approved" &&
                selectedInscricao.status !== "active_apprentice" &&
                selectedInscricao.status !== "rejected" && (
                  <Button asChild>
                    <Link
                      to={`/jovens/gestao/analise/${selectedInscricao.id}`}
                      onClick={() => setViewDialogOpen(false)}
                    >
                      <ClipboardCheck className="w-4 h-4 mr-2" />
                      Modo Análise
                    </Link>
                  </Button>
                )}
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedInscricao(selectedInscricao);
                  setNotesDialogOpen(true);
                  fetchNotes(selectedInscricao.id);
                }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Adicionar Notas
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedInscricao(selectedInscricao);
                  setStatusDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Alterar Status
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedInscricao(selectedInscricao);
                  setHistoryDialogOpen(true);
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Histórico
              </Button>
              {selectedInscricao && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleSendUploadLinkByWhatsApp(selectedInscricao)}
                    disabled={!selectedInscricao.contato_1}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSendUploadLinkByEmail(selectedInscricao)}
                    disabled={!selectedInscricao.email || emailSendingForInscricaoId === selectedInscricao.id}
                  >
                    {emailSendingForInscricaoId === selectedInscricao.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Enviar Link por E-mail
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Selecione o novo status para esta inscrição
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="completed">Completo</SelectItem>
                  <SelectItem value="talent_bank">Banco de Talentos</SelectItem>
                  <SelectItem value="under_analysis">Em Análise</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="active_apprentice">
                    Aprendiz Ativo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(newStatus === "rejected" ||
              (selectedInscricao?.status === "rejected" &&
                newStatus === "talent_bank")) && (
              <div>
                <Label>
                  {newStatus === "rejected"
                    ? "Motivo da reprovação *"
                    : "Motivo do retorno"}
                </Label>
                <Textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder={
                    newStatus === "rejected"
                      ? "Informe o motivo da reprovação"
                      : "Informe o motivo do retorno ao banco"
                  }
                  rows={3}
                />
              </div>
            )}
            <div>
              <Label>Observação</Label>
              <Textarea
                value={statusObservation}
                onChange={(e) => setStatusObservation(e.target.value)}
                placeholder="Observação opcional"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleStatusChange} disabled={!newStatus}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InscricaoStatusHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        inscricaoId={selectedInscricao?.id}
        currentStatus={selectedInscricao?.status}
        onStatusUpdated={async () => {
          await fetchCounts();
          await fetchInscricoes();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cadastro</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme a exclusão do cadastro de{" "}
              {deleteTarget?.nome_completo || "jovem selecionado"} do Banco de
              Talentos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletingCadastro}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingCadastro}
              onClick={(event) => {
                event.preventDefault();
                handleDeleteCadastro();
              }}
            >
              {deletingCadastro ? "Excluindo..." : "Excluir cadastro"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de comentários</DialogTitle>
            <DialogDescription>
              Cada comentário fica registrado com autor, data e horário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Novo comentário</Label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Digite um novo comentário..."
                rows={4}
              />
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border p-3">
              {notesLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Carregando comentários...
                </p>
              ) : notes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum comentário registrado ainda.
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-md border bg-card p-3">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{note.createdByName || "Sistema"}</span>
                        {note.createdByCargo && (
                          <Badge variant="outline" className="h-5 px-1.5 py-0 text-xs">
                            {note.createdByCargo}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{note.note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={notesSubmitting || !noteText.trim()}
            >
              {notesSubmitting ? "Salvando..." : "Adicionar comentário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para exibir detalhes da inscrição
function InscricaoDetails({
  inscricao,
}: {
  inscricao: Inscricao;
}) {
  const [fullData, setFullData] = useState<Inscricao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFullData() {
      try {
        const { data, error } = await supabase
          .from("inscricoes_jovens_aprendizes")
          .select("*")
          .eq("id", inscricao.id)
          .single();

        if (error) throw error;
        setFullData(data);
      } catch (error) {
        console.error("Error loading full data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadFullData();
  }, [inscricao.id]);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const data = fullData || inscricao;

  return (
    <div className="space-y-6">
      {/* Status e Progresso */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={statusConfig[inscricao.status]?.variant || "outline"}
            >
              {statusConfig[inscricao.status]?.label || inscricao.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progresso do Cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completude</span>
                <span>{inscricao.completion_percentage || 0}%</span>
              </div>
              <Progress value={inscricao.completion_percentage || 0} />
              <p className="text-xs text-muted-foreground">
                Etapa {inscricao.current_step} de 3
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">
              Nome Completo
            </Label>
            <p className="font-medium">{inscricao.nome_completo || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">CPF</Label>
            <p>{inscricao.cpf ? formatCpf(inscricao.cpf) : "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p>{inscricao.email || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Data de Nascimento
            </Label>
            <p>{formatDateOnly(inscricao.data_nascimento) || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Contato</Label>
            <p>{inscricao.contato_1 || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Data de Inscrição
            </Label>
            <p>
              {inscricao.created_at
                ? format(new Date(inscricao.created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      {(inscricao.data_aprovacao ||
        inscricao.data_contrato ||
        inscricao.empresa ||
        inscricao.turma) && (
        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {inscricao.data_aprovacao && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Data de Aprovação
                </Label>
                <p>
                  {format(new Date(inscricao.data_aprovacao), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            )}
            {inscricao.data_contrato && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Data do Contrato
                </Label>
                <p>
                  {format(new Date(inscricao.data_contrato), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            )}
            {inscricao.empresa && (
              <div>
                <Label className="text-xs text-muted-foreground">Empresa</Label>
                <p>{inscricao.empresa.nome_fantasia || "—"}</p>
              </div>
            )}
            {inscricao.turma && (
              <div>
                <Label className="text-xs text-muted-foreground">Turma</Label>
                <p>{inscricao.turma.nome || "—"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
