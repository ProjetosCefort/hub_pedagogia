import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  Filter,
  Mail,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { sendScheduleEmail } from "@/lib/email";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "agendado", label: "Agendado" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "intervencao", label: "Intervenção" },
  { value: "avaliacao_pedagogica", label: "Avaliação Pedagógica" },
  { value: "avaliacao_socioeconomica", label: "Avaliação Socioeconômica" },
  { value: "encaminhamento", label: "Encaminhamento" },
];
const TYPE_OPTIONS_PSICOSSOCIAL = [
  { value: "all", label: "Todos os tipos" },
  { value: "intervencao", label: "Intervenção" },
  { value: "avaliacao_pedagogica", label: "Avaliação Pedagógica" },
];
const TYPE_OPTIONS_SERVICO_SOCIAL = [
  { value: "all", label: "Todos os tipos" },
  { value: "avaliacao_socioeconomica", label: "Avaliação Socioeconômica" },
  { value: "encaminhamento", label: "Encaminhamento" },
];

const RESPONSAVEL_NONE = "__none__";
const FETCH_PAGE_SIZE = 1000;

function toYyyyMmDd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const formats = ["dd/MM/yyyy", "yyyy-MM-dd", "d/M/yyyy", "yyyy-M-d"];
  for (const fmt of formats) {
    try {
      const parsed = parse(trimmed, fmt, new Date(), { locale: ptBR });
      if (isValid(parsed)) return parsed;
    } catch {
      // continue
    }
  }
  return null;
}

interface AgendaDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function AgendaDateField({ value, onChange, placeholder = "dd/mm/aaaa" }: AgendaDateFieldProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() =>
    value ? format(new Date(value + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "",
  );

  const date = value ? new Date(value + "T12:00:00") : undefined;
  const syncInputFromValue = useCallback((v: string) => {
    if (v) {
      try {
        setInputValue(format(new Date(v + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }));
      } catch {
        setInputValue("");
      }
    } else {
      setInputValue("");
    }
  }, []);

  useEffect(() => {
    syncInputFromValue(value);
  }, [value, syncInputFromValue]);

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    const next = toYyyyMmDd(d);
    onChange(next);
    setInputValue(format(d, "dd/MM/yyyy", { locale: ptBR }));
    setOpen(false);
  };

  const handleInputBlur = () => {
    const parsed = parseDateInput(inputValue);
    if (parsed) {
      onChange(toYyyyMmDd(parsed));
      setInputValue(format(parsed, "dd/MM/yyyy", { locale: ptBR }));
    } else if (!inputValue.trim()) {
      onChange("");
    } else {
      syncInputFromValue(value);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 w-full min-w-0 justify-start overflow-hidden text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {value
              ? format(new Date(value + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="dd/mm/aaaa"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={(e) => e.key === "Enter" && handleInputBlur()}
            className="h-9"
          />
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface AgendaItem {
  id: string;
  jovem_id: string | null;
  publico_externo: boolean;
  publico_nome: string | null;
  publico_contato: string | null;
  publico_descricao: string | null;
  setor: "psicossocial" | "servico_social";
  modalidade: "presencial" | "remoto";
  local_atendimento: string | null;
  link_atendimento: string | null;
  modelo_agendamento: string | null;
  tipo: "intervencao" | "avaliacao_pedagogica" | "avaliacao_socioeconomica" | "encaminhamento";
  titulo: string;
  descricao: string | null;
  agendado_para: string;
  duracao_minutos: number | null;
  responsavel_id: string | null;
  created_by: string | null;
  status: "agendado" | "realizado" | "cancelado";
  jovem?: {
    id: string;
    nome_completo: string;
    email: string | null;
    celular: string | null;
  } | null;
  responsavel_nome?: string;
  criado_por_nome?: string;
  anexos?: Array<{ id: string }> | null;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface AgendaListProps {
  sector?: "psicossocial" | "servico_social";
}

export default function AgendaList({ sector }: AgendaListProps) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmailForId, setSendingEmailForId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [responsavelOptions, setResponsavelOptions] = useState<Array<{ id: string; nome: string }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState<string>(() =>
    addDays(new Date(), 30).toISOString().slice(0, 10),
  );
  const { toast } = useToast();
  const basePath = sector === "servico_social" ? "/servico-social/agenda" : "/psicossocial/agenda";
  const moduleLabel = sector === "servico_social" ? "Serviço Social" : "Psicossocial";
  const typeOptions =
    sector === "psicossocial"
      ? TYPE_OPTIONS_PSICOSSOCIAL
      : sector === "servico_social"
        ? TYPE_OPTIONS_SERVICO_SOCIAL
        : TYPE_OPTIONS;

  useEffect(() => {
    fetchAgenda();
  }, [startDate, endDate, sector]);

  async function fetchAgenda() {
    try {
      setLoading(true);
      const agenda: any[] = [];
      let pageStart = 0;

      while (true) {
        let query = supabase
          .from("atendimentos_agendados")
          .select(
            `
            id,
            jovem_id,
            publico_externo,
            publico_nome,
            publico_contato,
            publico_descricao,
            tipo,
            titulo,
            descricao,
            agendado_para,
            duracao_minutos,
            modalidade,
            local_atendimento,
            link_atendimento,
            modelo_agendamento,
            responsavel_id,
            created_by,
            status,
            setor,
            jovem:jovens(id, nome_completo, email, celular),
            anexos:atendimentos_agendados_anexos(id)
          `,
          )
          .order("agendado_para", { ascending: true })
          .range(pageStart, pageStart + FETCH_PAGE_SIZE - 1);

        if (sector) {
          query = query.eq("setor", sector);
        }

        if (startDate) {
          const from = new Date(startDate);
          query = query.gte("agendado_para", from.toISOString());
        }

        if (endDate) {
          const to = addDays(new Date(endDate), 1);
          query = query.lt("agendado_para", to.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        const chunk = data || [];
        agenda.push(...chunk);

        if (chunk.length < FETCH_PAGE_SIZE) {
          break;
        }
        pageStart += FETCH_PAGE_SIZE;
      }

      const userIds = Array.from(
        new Set(
          agenda
            .map((item: any) => item.responsavel_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      agenda.forEach((item: any) => {
        if (item.created_by) userIds.push(item.created_by);
      });

      const profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", userIds);

        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, profile.nome_completo);
        });
      }

      const hydrated: AgendaItem[] = agenda.map((item: any) => ({
        ...item,
        responsavel_nome: item.responsavel_id
          ? profilesMap.get(item.responsavel_id) || "–"
          : "Sem responsável",
        criado_por_nome: item.created_by
          ? profilesMap.get(item.created_by) || "–"
          : "Sistema",
      }));

      const uniqueResponsaveis = new Map<string, string>();
      hydrated.forEach((item) => {
        if (item.responsavel_id && item.responsavel_nome) {
          uniqueResponsaveis.set(item.responsavel_id, item.responsavel_nome);
        }
      });

      setResponsavelOptions(
        Array.from(uniqueResponsaveis.entries())
          .map(([id, nome]) => ({ id, nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );

      setItems(hydrated);
    } catch (error: any) {
      console.error("Erro ao carregar agenda:", error);
      toast({
        title: "Erro ao carregar agenda",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendByEmail(item: AgendaItem) {
    const email = item.publico_externo
      ? item.publico_contato?.includes("@")
        ? item.publico_contato
        : null
      : item.jovem?.email;
    if (!email) {
      toast({
        title: "E-mail não encontrado",
        description: "Este agendamento não possui e-mail cadastrado.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmailForId(item.id);
    try {
      const ok = await sendScheduleEmail({
        email,
        nome: getAudienceName(item),
        titulo: item.titulo,
        dataHora: format(new Date(item.agendado_para), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        setor: item.setor === "servico_social" ? "Serviço Social" : "Psicossocial",
        modalidade: item.modalidade === "remoto" ? "Remoto" : "Presencial",
        localOuLink:
          item.modalidade === "remoto"
            ? item.link_atendimento || undefined
            : item.local_atendimento || undefined,
        descricao: item.descricao || undefined,
      });

      if (!ok) {
        throw new Error("Falha ao enviar e-mail");
      }

      toast({
        title: "Agendamento enviado",
        description: "E-mail enviado para o jovem com os detalhes do agendamento.",
      });
    } catch {
      toast({
        title: "Falha ao enviar e-mail",
        description: "Não foi possível enviar o agendamento por e-mail.",
        variant: "destructive",
      });
    } finally {
      setSendingEmailForId(null);
    }
  }

  function handleSendByWhatsApp(item: AgendaItem) {
    const telefone = (
      item.publico_externo ? item.publico_contato || "" : item.jovem?.celular || ""
    ).replace(/\D/g, "");
    if (!telefone) {
      toast({
        title: "Telefone não encontrado",
        description: "Este agendamento não possui telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }

    const mensagem = [
      `Olá, ${getAudienceName(item)}!`,
      "Segue o seu agendamento no CEFORT:",
      `Título: ${item.titulo}`,
      `Data e horário: ${format(new Date(item.agendado_para), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
      `Setor: ${item.setor === "servico_social" ? "Serviço Social" : "Psicossocial"}`,
      `Modalidade: ${item.modalidade === "remoto" ? "Remoto" : "Presencial"}`,
      item.modalidade === "remoto"
        ? `Link: ${item.link_atendimento || "não informado"}`
        : `Local: ${item.local_atendimento || "não informado"}`,
      item.descricao ? `Observações: ${item.descricao}` : "",
      item.publico_externo && item.publico_descricao
        ? `Público: ${item.publico_descricao}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener,noreferrer");
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesType = typeFilter === "all" || item.tipo === typeFilter;
      const matchesResponsavel =
        responsavelFilter === "all" ||
        (responsavelFilter === RESPONSAVEL_NONE && !item.responsavel_id) ||
        item.responsavel_id === responsavelFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        item.titulo.toLowerCase().includes(term) ||
        (item.publico_nome || "").toLowerCase().includes(term) ||
        (item.publico_contato || "").toLowerCase().includes(term) ||
        (item.jovem?.nome_completo || "")
          .toLowerCase()
          .includes(term);

      return matchesStatus && matchesType && matchesResponsavel && matchesSearch;
    });
  }, [items, statusFilter, typeFilter, responsavelFilter, searchTerm]);

  const dateRangeLabel = useMemo(() => {
    if (!startDate && !endDate) {
      return "Todos os atendimentos";
    }
    const start =
      startDate && !Number.isNaN(new Date(startDate).getTime())
        ? format(new Date(startDate), "dd/MM", { locale: ptBR })
        : "—";
    const end =
      endDate && !Number.isNaN(new Date(endDate).getTime())
        ? format(new Date(endDate), "dd/MM", { locale: ptBR })
        : "—";
    return `${start} - ${end}`;
  }, [startDate, endDate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Agenda de atendimentos</h1>
          <p className="page-description">
            {moduleLabel} • Período selecionado: {dateRangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={fetchAgenda} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button asChild>
            <Link to={`${basePath}/nova`}>
              <Plus className="w-4 h-4 mr-2" />
              Novo agendamento
            </Link>
          </Button>
        </div>
      </div>

      <Card className="card-elevated filters-panel">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Atendimentos agendados
          </CardTitle>
          <CardDescription>
            Filtre por status, responsável ou tipo para encontrar rapidamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="filters-grid">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</span>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responsável</span>
              <Select
                value={responsavelFilter}
                onValueChange={setResponsavelFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  <SelectItem value={RESPONSAVEL_NONE}>Sem responsável</SelectItem>
                  {responsavelOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Busca rápida</span>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Filtrar por jovem ou título"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Período
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <AgendaDateField
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Data inicial"
                />
                <AgendaDateField
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Data final"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                Altere as datas para atualizar a lista automaticamente. Deixe em branco para não limitar.
              </span>
            </div>
          </div>

          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Agendado por</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      Carregando agenda...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum atendimento agendado encontrado para os filtros selecionados.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {format(new Date(item.agendado_para), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {item.duracao_minutos && (
                          <span className="text-xs text-muted-foreground block">
                            {item.duracao_minutos} min
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.publico_externo ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {item.publico_nome || "Público externo"}
                            </p>
                            {item.publico_contato && (
                              <p className="text-xs text-muted-foreground">
                                {item.publico_contato}
                              </p>
                            )}
                          </div>
                        ) : item.jovem?.id || item.jovem_id ? (
                          <Link
                            to={`/jovens/${item.jovem?.id ?? item.jovem_id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {item.jovem?.nome_completo || "Jovem removido"}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Público não informado
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <p className="font-medium text-sm truncate">{item.titulo}</p>
                        {item.descricao && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.descricao}
                          </p>
                        )}
                        {item.publico_externo && item.publico_descricao && (
                          <p className="text-xs text-muted-foreground truncate">
                            Público: {item.publico_descricao}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTipoLabel(item.tipo)}</Badge>
                        {item.modelo_agendamento && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Modelo: {getModeloAgendamentoLabel(item.modelo_agendamento)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.modalidade === "remoto" ? "Remoto" : "Presencial"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[180px]">
                          {item.modalidade === "remoto" ? (
                            item.link_atendimento ? (
                              <a
                                href={item.link_atendimento}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                Abrir link
                              </a>
                            ) : (
                              "Sem link"
                            )
                          ) : (
                            item.local_atendimento || "Sem local"
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {item.responsavel_nome || "Sem responsável"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {item.criado_por_nome || "Sistema"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.anexos?.length ? (
                          <Badge variant="outline" className="gap-1">
                            <Paperclip className="w-3 h-3" />
                            {item.anexos.length}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleSendByWhatsApp(item)} title="Enviar por WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendByEmail(item)}
                            title="Enviar por e-mail"
                            disabled={sendingEmailForId === item.id}
                          >
                            <Mail className={cn("w-4 h-4", sendingEmailForId === item.id && "animate-pulse")} />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`${basePath}/${item.id}/editar`}>Editar</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getTipoLabel(tipo: AgendaItem["tipo"]) {
  switch (tipo) {
    case "intervencao":
      return "Intervenção";
    case "avaliacao_pedagogica":
      return "Avaliação Pedagógica";
    case "avaliacao_socioeconomica":
      return "Avaliação Socioeconômica";
    case "encaminhamento":
      return "Encaminhamento";
    default:
      return tipo;
  }
}

function getStatusLabel(status: AgendaItem["status"]) {
  switch (status) {
    case "agendado":
      return "Agendado";
    case "realizado":
      return "Realizado";
    case "cancelado":
      return "Cancelado";
    default:
      return status;
  }
}

function getStatusVariant(status: AgendaItem["status"]): BadgeVariant {
  switch (status) {
    case "agendado":
      return "secondary";
    case "realizado":
      return "default";
    case "cancelado":
      return "destructive";
    default:
      return "outline";
  }
}

function getAudienceName(item: AgendaItem): string {
  if (item.publico_externo) {
    return item.publico_nome || "público externo";
  }
  return item.jovem?.nome_completo || "jovem";
}

function getModeloAgendamentoLabel(value: string): string {
  switch (value) {
    case "avaliacao_inicial":
      return "Avaliação inicial";
    case "retorno":
      return "Retorno";
    case "orientacao_familiar":
      return "Orientação familiar";
    case "acompanhamento":
      return "Acompanhamento";
    case "outros":
      return "Outros";
    default:
      return value;
  }
}
