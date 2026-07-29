import { useState } from "react";
import { Settings, AlertTriangle, FileText, GraduationCap, Building2, Sliders, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { MotivosIntervencaoTab } from "./tabs/MotivosIntervencaoTab";
import { MotivosAvaliacaoPedagogicaTab } from "./tabs/MotivosAvaliacaoPedagogicaTab";
import { AtendimentosServicoSocialTab } from "./tabs/AtendimentosServicoSocialTab";
import { AproveitamentoEscolarTab } from "./tabs/AproveitamentoEscolarTab";
import { RegistrosSociaisTab } from "./tabs/RegistrosSociaisTab";
import { ModelosEncaminhamentoTab } from "./tabs/ModelosEncaminhamentoTab";
import { ModelosDocumentosTab } from "./tabs/ModelosDocumentosTab";
import { ParametrosGlobaisTab } from "./tabs/ParametrosGlobaisTab";
import { PerfisPermissoesTab } from "./tabs/PerfisPermissoesTab";

const tabs = [
  { 
    id: "motivos", 
    label: "Motivos de Intervenção", 
    icon: AlertTriangle,
    description: "Configure os motivos usados em intervenções do Psicossocial"
  },
  {
    id: "motivos-pedagogicos",
    label: "Abordagem Pedagógica",
    icon: GraduationCap,
    description: "Tipos exibidos no campo 'Tipo de abordagem pedagógica' da avaliação"
  },
  {
    id: "atendimentos-servico-social",
    label: "Atendimentos (Serviço Social)",
    icon: AlertTriangle,
    description: "Lista específica de atendimentos do Serviço Social"
  },
  { 
    id: "aproveitamento", 
    label: "Aproveitamento Escolar", 
    icon: GraduationCap,
    description: "Tipos de classificação de aproveitamento educacional"
  },
  { 
    id: "registros", 
    label: "Registros Sociais", 
    icon: Building2,
    description: "Tipos de registros sociais institucionais (CMAS, CMDCA, etc.)"
  },
  { 
    id: "modelos", 
    label: "Modelos de Encaminhamento", 
    icon: FileText,
    description: "Templates reutilizáveis para encaminhamentos"
  },
  {
    id: "modelos-documentos",
    label: "Modelos de Documentos",
    icon: FileText,
    description: "Modelos para emissão interna de documentos do CEFORT"
  },
  { 
    id: "parametros", 
    label: "Parâmetros Globais", 
    icon: Sliders,
    description: "Configurações gerais do sistema"
  },
  {
    id: "permissoes",
    label: "Perfis e Permissões",
    icon: ShieldCheck,
    description: "RBAC dinâmico por grupos/permissões"
  },
];

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState("motivos");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="page-title flex items-center gap-2">
              Configurações do Sistema
              <Badge variant="outline" className="ml-2 font-normal">
                Admin
              </Badge>
            </h1>
            <p className="page-description">
              Central de configuração de parâmetros institucionais
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">
                Configurações Centralizadas
              </p>
              <p className="text-sm text-amber-700 mt-1">
                As alterações feitas aqui impactam os formulários e módulos de todo o sistema. 
                Motivos, tipos e templates configurados serão usados dinamicamente nos registros.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto p-2 rounded-2xl border bg-background/80 backdrop-blur-sm grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="group min-h-[92px] w-full h-auto rounded-xl border border-transparent flex items-start justify-start gap-3 px-3 py-3 whitespace-normal text-left leading-tight transition-all duration-200 hover:bg-background hover:border-border/60 data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md"
            >
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                <tab.icon className="w-4 h-4" />
              </span>
              <span className="flex flex-col gap-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium break-words">{tab.label}</span>
                <span className="hidden xl:block text-xs text-muted-foreground">
                  {tab.description}
                </span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Description */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {tabs.find(t => t.id === activeTab)?.icon && (
                <span className="text-muted-foreground">
                  {(() => {
                    const Icon = tabs.find(t => t.id === activeTab)!.icon;
                    return <Icon className="w-5 h-5" />;
                  })()}
                </span>
              )}
              {tabs.find(t => t.id === activeTab)?.label}
            </CardTitle>
            <CardDescription>
              {tabs.find(t => t.id === activeTab)?.description}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Tab Contents */}
        <TabsContent value="motivos" className="mt-0">
          <MotivosIntervencaoTab />
        </TabsContent>

        <TabsContent value="motivos-pedagogicos" className="mt-0">
          <MotivosAvaliacaoPedagogicaTab />
        </TabsContent>

        <TabsContent value="atendimentos-servico-social" className="mt-0">
          <AtendimentosServicoSocialTab />
        </TabsContent>

        <TabsContent value="aproveitamento" className="mt-0">
          <AproveitamentoEscolarTab />
        </TabsContent>

        <TabsContent value="registros" className="mt-0">
          <RegistrosSociaisTab />
        </TabsContent>

        <TabsContent value="modelos" className="mt-0">
          <ModelosEncaminhamentoTab />
        </TabsContent>

        <TabsContent value="modelos-documentos" className="mt-0">
          <ModelosDocumentosTab />
        </TabsContent>

        <TabsContent value="parametros" className="mt-0">
          <ParametrosGlobaisTab />
        </TabsContent>

        <TabsContent value="permissoes" className="mt-0">
          <PerfisPermissoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
