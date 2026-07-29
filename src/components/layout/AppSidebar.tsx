import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  GraduationCap,
  Heart,
  ArrowRightLeft,
  Building2,
  School,
  BookOpen,
  LogOut,
  ChevronDown,
  Settings,
  UserCheck,
  ShieldCheck,
  CalendarDays,
  FolderKanban,
  Award,
  UsersRound,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Layers3,
  LineChart,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type SectorKey = "psicossocial" | "servico_social" | "pedagogico";
type SidebarNavItem = {
  title: string;
  url: string;
  icon: typeof Users;
  permission?: string;
  sector?: SectorKey;
  group?: "operacao" | "setor";
  activeExcludePrefix?: string;
};

const mainNavItems: SidebarNavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.read",
  },
  {
    title: "Jovens Aprendizes",
    url: "/jovens",
    icon: Users,
    permission: "jovens.read",
    activeExcludePrefix: "/jovens/gestao",
  },
  {
    title: "Banco de Talentos",
    url: "/jovens/gestao",
    icon: UserCheck,
    permission: "inscricoes.read",
  },
  {
    title: "Solicitações",
    url: "/solicitacoes",
    icon: ArrowLeftRight,
  },
  {
    title: "Relatórios",
    url: "/relatorios/jovens",
    icon: ChartNoAxesCombined,
    permission: "jovens.read",
  },
];

const atendimentoItems: SidebarNavItem[] = [
  {
    title: "Agenda",
    url: "/psicossocial/agenda",
    icon: CalendarDays,
    permission: "agenda.read",
    sector: "psicossocial",
    group: "setor",
  },
  {
    title: "Analitico",
    url: "/psicossocial/analitico",
    icon: LineChart,
    permission: "intervencoes_psicossocial.read",
    sector: "psicossocial",
    group: "setor",
  },
  {
    title: "Intervenções",
    url: "/intervencoes",
    icon: ClipboardList,
    permission: "intervencoes_psicossocial.read",
    sector: "psicossocial",
    group: "setor",
  },
  {
    title: "Coletivas",
    url: "/intervencoes/coletivas",
    icon: Layers3,
    permission: "intervencoes_psicossocial.read",
    sector: "psicossocial",
    group: "setor",
  },
  {
    title: "Avaliações Práticas",
    url: "/avaliacoes-praticas",
    icon: ClipboardList,
    permission: "intervencoes_psicossocial.read",
    sector: "psicossocial",
    group: "setor",
  },
  {
    title: "Avaliação Pedagógica",
    url: "/avaliacoes-pedagogicas",
    icon: GraduationCap,
    permission: "avaliacoes_pedagogicas.read",
    sector: "pedagogico",
    group: "setor",
  },
  {
    title: "Acompanhamento Social",
    url: "/servico-social/acompanhamento",
    icon: Heart,
    permission: "atendimentos_servico_social.read",
    sector: "servico_social",
    group: "setor",
  },
  {
    title: "Atendimentos",
    url: "/servico-social/atendimentos",
    icon: ClipboardList,
    permission: "atendimentos_servico_social.read",
    sector: "servico_social",
    group: "setor",
  },
  {
    title: "Agenda",
    url: "/servico-social/agenda",
    icon: CalendarDays,
    permission: "agenda.read",
    sector: "servico_social",
    group: "setor",
  },
  {
    title: "Avaliação Socioeconômica",
    url: "/avaliacoes-socioeconomicas",
    icon: Heart,
    permission: "avaliacoes_socioeconomicas.read",
    sector: "servico_social",
    group: "setor",
  },
  {
    title: "Encaminhamentos",
    url: "/encaminhamentos",
    icon: ArrowRightLeft,
    permission: "encaminhamentos.read",
    sector: "servico_social",
    group: "setor",
  },
  {
    title: "Projetos",
    url: "/projetos",
    icon: FolderKanban,
    permission: "projetos.read",
    sector: "servico_social",
    group: "setor",
  },
  {
    title: "Certificações",
    url: "/certificacoes",
    icon: Award,
    permission: "certificacoes.read",
    sector: "servico_social",
    group: "setor",
  },
  {
    title: "Relatórios",
    url: "/servico-social/relatorios",
    icon: ChartNoAxesCombined,
    permission: "avaliacoes_socioeconomicas.read",
    sector: "servico_social",
    group: "setor",
  },
  {
    title: "Conselho de Classe",
    url: "/conselho-classe",
    icon: UsersRound,
    permission: "conselho_classe.read",
    sector: "pedagogico",
    group: "setor",
  },
  {
    title: "Projetos",
    url: "/pedagogico/projetos",
    icon: FolderKanban,
    permission: "projetos.read",
    sector: "pedagogico",
    group: "setor",
  },
  {
    title: "Relatórios",
    url: "/pedagogico/relatorios",
    icon: ChartNoAxesCombined,
    permission: "avaliacoes_pedagogicas.read",
    sector: "pedagogico",
    group: "setor",
  },
  {
    title: "Declaração Escolar",
    url: "/pedagogico/declaracoes-escolares",
    icon: FileText,
    permission: "jovens.read",
    sector: "pedagogico",
    group: "setor",
  },
];

const cadastrosItems: SidebarNavItem[] = [
  { title: "Empresas", url: "/empresas", icon: Building2, permission: "cadastros.read" },
  { title: "Unidades", url: "/unidades", icon: School, permission: "cadastros.read" },
];

const planejamentoItems: SidebarNavItem[] = [
  { title: "Cursos", url: "/cursos", icon: GraduationCap, permission: "cadastros.read" },
  { title: "Disciplinas", url: "/disciplinas", icon: BookOpen, permission: "cadastros.read" },
  { title: "Ementas", url: "/ementas", icon: FileText, permission: "cadastros.read" },
  { title: "Turmas", url: "/turmas", icon: BookOpen, permission: "cadastros.read" },
  { title: "GOV", url: "/gov", icon: ShieldCheck, permission: "cadastros.read" },
];

const configItems: SidebarNavItem[] = [
  { title: "Configurações", url: "/configuracoes", icon: Settings, permission: "configuracoes.read" },
  { title: "Auditoria", url: "/auditoria", icon: ShieldCheck, permission: "auditoria.read" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user, roles } = useAuth();
  const { hasPermission } = usePermissions();
  const [psicossocialOpen, setPsicossocialOpen] = useState(true);
  const [servicoSocialOpen, setServicoSocialOpen] = useState(true);
  const [pedagogicoOpen, setPedagogicoOpen] = useState(true);
  const [cadastrosOpen, setCadastrosOpen] = useState(true);
  const [planejamentoOpen, setPlanejamentoOpen] = useState(true);

  const isActive = (url: string, excludePrefix?: string) => {
    const match =
      location.pathname === url || location.pathname.startsWith(url + "/");
    if (!match) return false;
    if (excludePrefix && location.pathname.startsWith(excludePrefix))
      return false;
    return true;
  };

  const isAdmin = roles.includes("admin");
  const canManageConfiguracoes = isAdmin || roles.includes("gestor");
  const isSetorAllowed = (sector?: SectorKey) =>
    !sector ||
    (sector === "psicossocial" &&
      (hasPermission("menu.setor.psicossocial") || isAdmin || roles.includes("gestor"))) ||
    (sector === "servico_social" &&
      (hasPermission("menu.setor.servico_social") || isAdmin || roles.includes("gestor"))) ||
    (sector === "pedagogico" &&
      (hasPermission("menu.setor.pedagogico") || isAdmin || roles.includes("gestor")));

  const visibleMainItems = mainNavItems.filter(
    (item) => !item.permission || hasPermission(item.permission) || isAdmin,
  );
  const visibleAtendimentoItems = atendimentoItems.filter(
    (item) =>
      (!item.permission || hasPermission(item.permission) || isAdmin) &&
      isSetorAllowed(item.sector),
  );
  const visiblePsicossocialItems = visibleAtendimentoItems.filter(
    (item) => item.group === "setor" && item.sector === "psicossocial",
  );
  const visibleServicoSocialItems = visibleAtendimentoItems.filter(
    (item) => item.group === "setor" && item.sector === "servico_social",
  );
  const visiblePedagogicoItems = visibleAtendimentoItems.filter(
    (item) => item.group === "setor" && item.sector === "pedagogico",
  );
  const visibleCadastrosItems = cadastrosItems.filter(
    (item) => !item.permission || hasPermission(item.permission) || isAdmin,
  );
  const visiblePlanejamentoItems = planejamentoItems.filter(
    (item) => !item.permission || hasPermission(item.permission) || isAdmin,
  );

  const visibleConfigItems = configItems.filter((item) => {
    if (item.url === "/configuracoes") {
      return canManageConfiguracoes || hasPermission("configuracoes.read");
    }
    if (item.url === "/auditoria") {
      return isAdmin || hasPermission("auditoria.read");
    }
    return true;
  });

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar-background">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-display font-bold text-sidebar-foreground text-lg leading-tight">
                HubCefort
              </h1>
              <p className="text-xs text-sidebar-muted">Pedagogia</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        isActive(item.url, item.activeExcludePrefix) &&
                          "bg-sidebar-accent text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary",
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Psicossocial */}
        {visiblePsicossocialItems.length > 0 && (
          <SidebarGroup>
            <Collapsible
              open={psicossocialOpen}
              onOpenChange={setPsicossocialOpen}
            >
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-lg px-3 py-2 transition-colors">
                  <span className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                    {!collapsed && "Psicossocial"}
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-sidebar-muted transition-transform duration-200",
                        psicossocialOpen && "rotate-180",
                      )}
                    />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visiblePsicossocialItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                              isActive(item.url) &&
                                "bg-sidebar-accent text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary",
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Serviço Social */}
        {visibleServicoSocialItems.length > 0 && (
          <SidebarGroup>
            <Collapsible
              open={servicoSocialOpen}
              onOpenChange={setServicoSocialOpen}
            >
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-lg px-3 py-2 transition-colors">
                  <span className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                    {!collapsed && "Serviço Social"}
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-sidebar-muted transition-transform duration-200",
                        servicoSocialOpen && "rotate-180",
                      )}
                    />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleServicoSocialItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                              isActive(item.url) &&
                                "bg-sidebar-accent text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary",
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Pedagógico */}
        {visiblePedagogicoItems.length > 0 && (
          <SidebarGroup>
            <Collapsible open={pedagogicoOpen} onOpenChange={setPedagogicoOpen}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-lg px-3 py-2 transition-colors">
                  <span className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                    {!collapsed && "Pedagógico"}
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-sidebar-muted transition-transform duration-200",
                        pedagogicoOpen && "rotate-180",
                      )}
                    />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visiblePedagogicoItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                              isActive(item.url) &&
                                "bg-sidebar-accent text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary",
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Cadastros */}
        <SidebarGroup>
          <Collapsible open={cadastrosOpen} onOpenChange={setCadastrosOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-lg px-3 py-2 transition-colors">
                <span className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                  {!collapsed && "Cadastros"}
                </span>
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-sidebar-muted transition-transform duration-200",
                      cadastrosOpen && "rotate-180",
                    )}
                  />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleCadastrosItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                            "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                            isActive(item.url) &&
                              "bg-sidebar-accent text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary",
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Planejamento Pedagógico */}
        {visiblePlanejamentoItems.length > 0 && (
          <SidebarGroup>
            <Collapsible open={planejamentoOpen} onOpenChange={setPlanejamentoOpen}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-lg px-3 py-2 transition-colors">
                  <span className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                    {!collapsed && "Planejamento Pedagógico"}
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-sidebar-muted transition-transform duration-200",
                        planejamentoOpen && "rotate-180",
                      )}
                    />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visiblePlanejamentoItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                              isActive(item.url) &&
                                "bg-sidebar-accent text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary",
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Configurações */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleConfigItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        isActive(item.url) &&
                          "bg-sidebar-accent text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary",
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.email}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
