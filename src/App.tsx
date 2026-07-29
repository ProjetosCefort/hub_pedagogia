import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const JovensList = lazy(() => import("./pages/jovens/JovensList"));
const JovemForm = lazy(() => import("./pages/jovens/JovemForm"));
const Prontuario = lazy(() => import("./pages/jovens/Prontuario"));
const GestaoJovensAprendizes = lazy(() => import("./pages/jovens/GestaoJovensAprendizes"));
const AnaliseJovem = lazy(() => import("./pages/jovens/AnaliseJovem"));
const CadastroPublico = lazy(() => import("./pages/jovens/CadastroPublico"));
const InscricaoJovemAprendiz = lazy(() => import("./pages/inscricao/InscricaoJovemAprendiz"));
const AcessoInscricao = lazy(() => import("./pages/inscricao/AcessoInscricao"));
const AcessoJovem = lazy(() => import("./pages/acesso-jovem/AcessoJovem"));
const MeuRegistro = lazy(() => import("./pages/meu-registro/MeuRegistro"));
const IntervencoesList = lazy(() => import("./pages/intervencoes/IntervencoesList"));
const IntervencaoForm = lazy(() => import("./pages/intervencoes/IntervencaoForm"));
const IntervencaoPrint = lazy(() => import("./pages/intervencoes/IntervencaoPrint"));
const IntervencoesColetivas = lazy(() => import("./pages/intervencoes/IntervencoesColetivas"));
const AvaliacaoPedagogicaList = lazy(() => import("./pages/avaliacoes/AvaliacaoPedagogicaList"));
const AvaliacaoPedagogicaForm = lazy(() => import("./pages/avaliacoes/AvaliacaoPedagogicaForm"));
const AvaliacaoPedagogicaPrint = lazy(() => import("./pages/avaliacoes/AvaliacaoPedagogicaPrint"));
const AvaliacaoSocioeconomicaList = lazy(() => import("./pages/avaliacoes/AvaliacaoSocioeconomicaList"));
const AvaliacaoSocioeconomicaForm = lazy(() => import("./pages/avaliacoes/AvaliacaoSocioeconomicaForm"));
const AvaliacaoSocioeconomicaPrint = lazy(() => import("./pages/avaliacoes/AvaliacaoSocioeconomicaPrint"));
const AvaliacoesPraticas = lazy(() => import("./pages/avaliacoes/AvaliacoesPraticas"));
const AvaliacaoPraticaPublica = lazy(() => import("./pages/avaliacoes/AvaliacaoPraticaPublica"));
const EncaminhamentosList = lazy(() => import("./pages/encaminhamentos/EncaminhamentosList"));
const EncaminhamentoForm = lazy(() => import("./pages/encaminhamentos/EncaminhamentoForm"));
const EncaminhamentoPrint = lazy(() => import("./pages/encaminhamentos/EncaminhamentoPrint"));
const Empresas = lazy(() => import("./pages/cadastros/Empresas"));
const Unidades = lazy(() => import("./pages/cadastros/Unidades"));
const Turmas = lazy(() => import("./pages/cadastros/Turmas"));
const Cursos = lazy(() => import("./pages/cadastros/Cursos"));
const Disciplinas = lazy(() => import("./pages/cadastros/Disciplinas"));
const Ementas = lazy(() => import("./pages/cadastros/Ementas"));
const EmentaPrint = lazy(() => import("./pages/cadastros/EmentaPrint"));
const GovValidacoes = lazy(() => import("./pages/cadastros/GovValidacoes"));
const Configuracoes = lazy(() => import("./pages/configuracoes/Configuracoes"));
const AuditLogs = lazy(() => import("./pages/auditoria/AuditLogs"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AgendaList = lazy(() => import("./pages/agenda/AgendaList"));
const AgendaForm = lazy(() => import("./pages/agenda/AgendaForm"));
const JovemVagaVinculosList = lazy(() => import("./pages/vagas/JovemVagaVinculosList"));
const JovemVagaVinculoForm = lazy(() => import("./pages/vagas/JovemVagaVinculoForm"));
const ProjetosList = lazy(() => import("./pages/projetos/ProjetosList"));
const ProjetoForm = lazy(() => import("./pages/projetos/ProjetoForm"));
const CertificacoesList = lazy(() => import("./pages/certificacoes/CertificacoesList"));
const CertificacaoForm = lazy(() => import("./pages/certificacoes/CertificacaoForm"));
const ConselhoClasseList = lazy(() => import("./pages/conselho/ConselhoClasseList"));
const ConselhoClasseForm = lazy(() => import("./pages/conselho/ConselhoClasseForm"));
const SolicitacoesSetoriais = lazy(() => import("./pages/solicitacoes/SolicitacoesSetoriais"));
const RelatoriosJovens = lazy(() => import("./pages/relatorios/RelatoriosJovens"));
const PsicossocialAnalytics = lazy(() => import("./pages/psicossocial/PsicossocialAnalytics"));
const RelatoriosPedagogicos = lazy(() => import("./pages/pedagogico/RelatoriosPedagogicos"));
const DeclaracoesEscolares = lazy(() => import("./pages/pedagogico/DeclaracoesEscolares"));
const AcompanhamentoSocial = lazy(() => import("./pages/servico-social/AcompanhamentoSocial"));
const RelatoriosServicoSocial = lazy(() => import("./pages/servico-social/RelatoriosServicoSocial"));
const GoogleOAuthCallback = lazy(() => import("./pages/auth/GoogleOAuthCallback"));

const queryClient = new QueryClient();
const routerBasename =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, "");

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse-soft text-muted-foreground">
        Carregando...
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
  allowedPermissions,
  withLayout = true,
}: {
  children: ReactNode;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  withLayout?: boolean;
}) {
  const { user, loading, roles } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  if (loading || permissionsLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleCheck =
    !allowedRoles || allowedRoles.some((role) => roles.includes(role));
  const permissionCheck =
    !allowedPermissions ||
    allowedPermissions.some((permission) => hasPermission(permission));

  const canAccess =
    allowedRoles && allowedPermissions
      ? roleCheck || permissionCheck
      : roleCheck && permissionCheck;

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!withLayout) {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public Routes */}
      <Route path="/cadastro" element={<CadastroPublico />} />
      <Route path="/inscricao" element={<InscricaoJovemAprendiz />} />
      <Route path="/inscricao/acesso" element={<AcessoInscricao />} />
      <Route path="/acesso-jovem" element={<AcessoJovem />} />
      <Route path="/meu-registro" element={<MeuRegistro />} />
      <Route path="/avaliacao-pratica/empresa" element={<AvaliacaoPraticaPublica />} />
      <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Jovens */}
      <Route
        path="/jovens"
        element={
          <ProtectedRoute>
            <JovensList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jovens/gestao"
        element={
          <ProtectedRoute allowedPermissions={["inscricoes.read"]}>
            <GestaoJovensAprendizes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jovens/gestao/analise/:id"
        element={
          <ProtectedRoute allowedPermissions={["inscricoes.status.manage"]}>
            <AnaliseJovem />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jovens/novo"
        element={
          <ProtectedRoute>
            <JovemForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jovens/:id"
        element={
          <ProtectedRoute>
            <Prontuario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jovens/:id/editar"
        element={
          <ProtectedRoute>
            <JovemForm />
          </ProtectedRoute>
        }
      />

      <Route
        path="/solicitacoes"
        element={
          <ProtectedRoute
            allowedRoles={[
              "admin",
              "gestor",
              "analista_pedagogico",
              "analista_social",
              "analista_psicossocial",
            ]}
          >
            <SolicitacoesSetoriais />
          </ProtectedRoute>
        }
      />

      <Route
        path="/relatorios/jovens"
        element={
          <ProtectedRoute allowedPermissions={["jovens.read"]}>
            <RelatoriosJovens />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedagogico/relatorios"
        element={
          <ProtectedRoute allowedPermissions={["avaliacoes_pedagogicas.read"]}>
            <RelatoriosPedagogicos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedagogico/declaracoes-escolares"
        element={
          <ProtectedRoute allowedPermissions={["jovens.read"]}>
            <DeclaracoesEscolares />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedagogico/projetos"
        element={
          <ProtectedRoute allowedPermissions={["projetos.read"]}>
            <ProjetosList context="pedagogico" basePath="/pedagogico/projetos" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedagogico/projetos/novo"
        element={
          <ProtectedRoute allowedPermissions={["projetos.write"]}>
            <ProjetoForm context="pedagogico" basePath="/pedagogico/projetos" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedagogico/projetos/:id"
        element={
          <ProtectedRoute allowedPermissions={["projetos.write"]}>
            <ProjetoForm context="pedagogico" basePath="/pedagogico/projetos" />
          </ProtectedRoute>
        }
      />

      {/* Agenda legado */}
      <Route
        path="/agenda"
        element={<Navigate to="/psicossocial/agenda" replace />}
      />
      <Route
        path="/agenda/nova"
        element={<Navigate to="/psicossocial/agenda/nova" replace />}
      />
      <Route
        path="/agenda/:id/editar"
        element={<Navigate to="/psicossocial/agenda" replace />}
      />

      {/* Agenda Psicossocial */}
      <Route
        path="/psicossocial/agenda"
        element={
          <ProtectedRoute allowedPermissions={["agenda.read"]}>
            <AgendaList sector="psicossocial" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/psicossocial/analitico"
        element={
          <ProtectedRoute allowedPermissions={["intervencoes_psicossocial.read"]}>
            <PsicossocialAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/psicossocial/agenda/nova"
        element={
          <ProtectedRoute allowedPermissions={["agenda.write"]}>
            <AgendaForm sector="psicossocial" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/psicossocial/agenda/:id/editar"
        element={
          <ProtectedRoute allowedPermissions={["agenda.write"]}>
            <AgendaForm sector="psicossocial" />
          </ProtectedRoute>
        }
      />

      {/* Agenda Serviço Social */}
      <Route
        path="/servico-social/agenda"
        element={
          <ProtectedRoute allowedPermissions={["agenda.read"]}>
            <AgendaList sector="servico_social" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servico-social/agenda/nova"
        element={
          <ProtectedRoute allowedPermissions={["agenda.write"]}>
            <AgendaForm sector="servico_social" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servico-social/agenda/:id/editar"
        element={
          <ProtectedRoute allowedPermissions={["agenda.write"]}>
            <AgendaForm sector="servico_social" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servico-social/acompanhamento"
        element={
          <ProtectedRoute
            allowedPermissions={[
              "atendimentos_servico_social.read",
              "avaliacoes_socioeconomicas.read",
            ]}
          >
            <AcompanhamentoSocial />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servico-social/relatorios"
        element={
          <ProtectedRoute
            allowedPermissions={[
              "avaliacoes_socioeconomicas.read",
              "projetos.read",
            ]}
          >
            <RelatoriosServicoSocial />
          </ProtectedRoute>
        }
      />

      {/* Intervenções */}
      <Route
        path="/intervencoes"
        element={
          <ProtectedRoute allowedPermissions={["intervencoes_psicossocial.read"]}>
            <IntervencoesList
              sector="psicossocial"
              title="Intervenções"
              description="Registros de atendimentos e intervenções do Psicossocial"
              basePath="/intervencoes"
              createLabel="Nova Intervenção"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intervencoes/coletivas"
        element={
          <ProtectedRoute allowedPermissions={["intervencoes_psicossocial.read"]}>
            <IntervencoesColetivas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intervencoes/nova"
        element={
          <ProtectedRoute allowedPermissions={["intervencoes_psicossocial.write"]}>
            <IntervencaoForm
              sector="psicossocial"
              basePath="/intervencoes"
              title="Nova Intervenção"
              editTitle="Editar Intervenção"
              submitCreateLabel="Intervenção registrada com sucesso!"
              submitEditLabel="Intervenção atualizada com sucesso!"
              motivoLabel="Motivo da Intervenção"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intervencoes/:id"
        element={
          <ProtectedRoute allowedPermissions={["intervencoes_psicossocial.write"]}>
            <IntervencaoForm
              sector="psicossocial"
              basePath="/intervencoes"
              title="Nova Intervenção"
              editTitle="Editar Intervenção"
              submitCreateLabel="Intervenção registrada com sucesso!"
              submitEditLabel="Intervenção atualizada com sucesso!"
              motivoLabel="Motivo da Intervenção"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intervencoes/:id/imprimir"
        element={
          <ProtectedRoute
            allowedPermissions={["intervencoes_psicossocial.read"]}
            withLayout={false}
          >
            <IntervencaoPrint />
          </ProtectedRoute>
        }
      />

      {/* Atendimentos Serviço Social */}
      <Route
        path="/servico-social/atendimentos"
        element={
          <ProtectedRoute allowedPermissions={["atendimentos_servico_social.read"]}>
            <IntervencoesList
              sector="servico_social"
              title="Atendimentos"
              description="Registros de atendimentos do Serviço Social"
              basePath="/servico-social/atendimentos"
              createLabel="Novo Atendimento"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servico-social/atendimentos/nova"
        element={
          <ProtectedRoute allowedPermissions={["atendimentos_servico_social.write"]}>
            <IntervencaoForm
              sector="servico_social"
              basePath="/servico-social/atendimentos"
              title="Novo Atendimento"
              editTitle="Editar Atendimento"
              submitCreateLabel="Atendimento registrado com sucesso!"
              submitEditLabel="Atendimento atualizado com sucesso!"
              motivoLabel="Tipo de Atendimento"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servico-social/atendimentos/:id"
        element={
          <ProtectedRoute allowedPermissions={["atendimentos_servico_social.write"]}>
            <IntervencaoForm
              sector="servico_social"
              basePath="/servico-social/atendimentos"
              title="Novo Atendimento"
              editTitle="Editar Atendimento"
              submitCreateLabel="Atendimento registrado com sucesso!"
              submitEditLabel="Atendimento atualizado com sucesso!"
              motivoLabel="Tipo de Atendimento"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servico-social/atendimentos/:id/imprimir"
        element={
          <ProtectedRoute
            allowedPermissions={["atendimentos_servico_social.read"]}
            withLayout={false}
          >
            <IntervencaoPrint />
          </ProtectedRoute>
        }
      />

      {/* Vínculos de vaga */}
      <Route
        path="/vagas-vinculos"
        element={
          <ProtectedRoute allowedPermissions={["jovem_vagas.read"]}>
            <JovemVagaVinculosList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vagas-vinculos/novo"
        element={
          <ProtectedRoute allowedPermissions={["jovem_vagas.write"]}>
            <JovemVagaVinculoForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vagas-vinculos/:id"
        element={
          <ProtectedRoute allowedPermissions={["jovem_vagas.write"]}>
            <JovemVagaVinculoForm />
          </ProtectedRoute>
        }
      />

      {/* Projetos */}
      <Route
        path="/projetos"
        element={
          <ProtectedRoute allowedPermissions={["projetos.read"]}>
            <ProjetosList context="servico_social" basePath="/projetos" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/novo"
        element={
          <ProtectedRoute allowedPermissions={["projetos.write"]}>
            <ProjetoForm context="servico_social" basePath="/projetos" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/:id"
        element={
          <ProtectedRoute allowedPermissions={["projetos.write"]}>
            <ProjetoForm context="servico_social" basePath="/projetos" />
          </ProtectedRoute>
        }
      />

      {/* Certificações */}
      <Route
        path="/certificacoes"
        element={
          <ProtectedRoute allowedPermissions={["certificacoes.read"]}>
            <CertificacoesList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificacoes/nova"
        element={
          <ProtectedRoute allowedPermissions={["certificacoes.write"]}>
            <CertificacaoForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificacoes/:id"
        element={
          <ProtectedRoute allowedPermissions={["certificacoes.write"]}>
            <CertificacaoForm />
          </ProtectedRoute>
        }
      />

      {/* Conselho de Classe */}
      <Route
        path="/conselho-classe"
        element={
          <ProtectedRoute allowedPermissions={["conselho_classe.read"]}>
            <ConselhoClasseList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/conselho-classe/novo"
        element={
          <ProtectedRoute allowedPermissions={["conselho_classe.write"]}>
            <ConselhoClasseForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/conselho-classe/:id"
        element={
          <ProtectedRoute allowedPermissions={["conselho_classe.write"]}>
            <ConselhoClasseForm />
          </ProtectedRoute>
        }
      />

      {/* Avaliações */}
      <Route
        path="/avaliacoes-pedagogicas"
        element={
          <ProtectedRoute allowedPermissions={["avaliacoes_pedagogicas.read"]}>
            <AvaliacaoPedagogicaList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes-pedagogicas/nova"
        element={
          <ProtectedRoute allowedPermissions={["avaliacoes_pedagogicas.write"]}>
            <AvaliacaoPedagogicaForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes-pedagogicas/:id/imprimir"
        element={
          <ProtectedRoute
            allowedPermissions={["avaliacoes_pedagogicas.read"]}
            withLayout={false}
          >
            <AvaliacaoPedagogicaPrint />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes-socioeconomicas"
        element={
          <ProtectedRoute allowedPermissions={["avaliacoes_socioeconomicas.read"]}>
            <AvaliacaoSocioeconomicaList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes-socioeconomicas/nova"
        element={
          <ProtectedRoute
            allowedPermissions={["avaliacoes_socioeconomicas.write"]}
          >
            <AvaliacaoSocioeconomicaForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes-socioeconomicas/:id/editar"
        element={
          <ProtectedRoute
            allowedPermissions={["avaliacoes_socioeconomicas.write"]}
          >
            <AvaliacaoSocioeconomicaForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes-socioeconomicas/:id/imprimir"
        element={
          <ProtectedRoute
            allowedPermissions={["avaliacoes_socioeconomicas.read"]}
            withLayout={false}
          >
            <AvaliacaoSocioeconomicaPrint />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes-praticas"
        element={
          <ProtectedRoute allowedPermissions={["intervencoes_psicossocial.read"]}>
            <AvaliacoesPraticas />
          </ProtectedRoute>
        }
      />

      {/* Encaminhamentos */}
      <Route
        path="/encaminhamentos"
        element={
          <ProtectedRoute allowedPermissions={["encaminhamentos.read"]}>
            <EncaminhamentosList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/encaminhamentos/novo"
        element={
          <ProtectedRoute allowedPermissions={["encaminhamentos.write"]}>
            <EncaminhamentoForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/encaminhamentos/:id/imprimir"
        element={
          <ProtectedRoute
            allowedPermissions={["encaminhamentos.read"]}
            withLayout={false}
          >
            <EncaminhamentoPrint />
          </ProtectedRoute>
        }
      />

      {/* Cadastros */}
      <Route
        path="/empresas"
        element={
          <ProtectedRoute allowedPermissions={["cadastros.read"]}>
            <Empresas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/unidades"
        element={
          <ProtectedRoute allowedPermissions={["cadastros.read"]}>
            <Unidades />
          </ProtectedRoute>
        }
      />
      <Route
        path="/turmas"
        element={
          <ProtectedRoute allowedPermissions={["cadastros.read"]}>
            <Turmas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cursos"
        element={
          <ProtectedRoute allowedPermissions={["cadastros.read"]}>
            <Cursos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/disciplinas"
        element={
          <ProtectedRoute allowedPermissions={["cadastros.read"]}>
            <Disciplinas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ementas"
        element={
          <ProtectedRoute allowedPermissions={["cadastros.read"]}>
            <Ementas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ementas/:id/pdf"
        element={
          <ProtectedRoute allowedPermissions={["cadastros.read"]} withLayout={false}>
            <EmentaPrint />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gov"
        element={
          <ProtectedRoute allowedPermissions={["cadastros.read"]}>
            <GovValidacoes />
          </ProtectedRoute>
        }
      />

      {/* Configurações */}
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute
            allowedRoles={["admin", "gestor"]}
            allowedPermissions={["configuracoes.read", "configuracoes.write"]}
          >
            <Configuracoes />
          </ProtectedRoute>
        }
      />

      {/* Auditoria */}
      <Route
        path="/auditoria"
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
            allowedPermissions={["auditoria.read"]}
          >
            <AuditLogs />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={routerBasename}>
        <AuthProvider>
          <PermissionProvider>
            <AppRoutes />
          </PermissionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
