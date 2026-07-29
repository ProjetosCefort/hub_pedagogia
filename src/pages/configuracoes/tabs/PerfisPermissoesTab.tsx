import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type PermissionGroup = {
  id: string;
  nome: string;
  descricao: string | null;
  setor: string | null;
  ativo: boolean;
};

type PermissionKey = {
  id: string;
  chave: string;
  modulo: string;
  acao: string;
  descricao: string | null;
};

type GroupItem = {
  id: string;
  group_id: string;
  permission_key_id: string;
};

type UserAssignment = {
  id: string;
  user_id: string;
  group_id: string;
};

type Profile = {
  id: string;
  email: string;
  nome_completo: string;
};

type PermissionDisplay = {
  modulo: string;
  titulo: string;
  descricao: string;
};

const PERMISSION_DISPLAY: Record<string, PermissionDisplay> = {
  "dashboard.read": {
    modulo: "Dashboard",
    titulo: "Visualizar Dashboard",
    descricao: "Permite acessar os indicadores e atalhos da tela inicial.",
  },
  "jovens.read": {
    modulo: "Jovens Aprendizes",
    titulo: "Visualizar jovens e prontuário",
    descricao: "Permite consultar cadastros e prontuários dos jovens.",
  },
  "jovens.write": {
    modulo: "Jovens Aprendizes",
    titulo: "Cadastrar e editar jovens",
    descricao: "Permite criar e alterar dados cadastrais dos jovens.",
  },
  "inscricoes.read": {
    modulo: "Banco de Talentos",
    titulo: "Visualizar inscrições",
    descricao: "Permite consultar inscrições e análises do banco de talentos.",
  },
  "inscricoes.status.manage": {
    modulo: "Banco de Talentos",
    titulo: "Alterar status de inscrições",
    descricao: "Permite aprovar, reprovar e movimentar inscrições.",
  },
  "agenda.read": {
    modulo: "Agenda",
    titulo: "Visualizar agenda",
    descricao: "Permite consultar atendimentos agendados.",
  },
  "agenda.write": {
    modulo: "Agenda",
    titulo: "Gerenciar agenda",
    descricao: "Permite criar e alterar atendimentos agendados.",
  },
  "intervencoes_psicossocial.read": {
    modulo: "Psicossocial",
    titulo: "Visualizar histórico de intervenções psicossociais",
    descricao: "Permite ver intervenções psicossociais no prontuário, listas e relatórios.",
  },
  "intervencoes_psicossocial.write": {
    modulo: "Psicossocial",
    titulo: "Gerenciar intervenções psicossociais",
    descricao: "Permite registrar e editar intervenções psicossociais.",
  },
  "atendimentos_servico_social.read": {
    modulo: "Serviço Social",
    titulo: "Visualizar histórico de atendimentos do Serviço Social",
    descricao: "Permite ver atendimentos do Serviço Social no prontuário, listas e relatórios.",
  },
  "atendimentos_servico_social.write": {
    modulo: "Serviço Social",
    titulo: "Gerenciar atendimentos do Serviço Social",
    descricao: "Permite registrar e editar atendimentos do Serviço Social.",
  },
  "avaliacoes_pedagogicas.read": {
    modulo: "Pedagógico",
    titulo: "Visualizar avaliações pedagógicas",
    descricao: "Permite consultar avaliações pedagógicas.",
  },
  "avaliacoes_pedagogicas.write": {
    modulo: "Pedagógico",
    titulo: "Gerenciar avaliações pedagógicas",
    descricao: "Permite criar e editar avaliações pedagógicas.",
  },
  "avaliacoes_socioeconomicas.read": {
    modulo: "Serviço Social",
    titulo: "Visualizar avaliações socioeconômicas",
    descricao: "Permite consultar avaliações socioeconômicas.",
  },
  "avaliacoes_socioeconomicas.write": {
    modulo: "Serviço Social",
    titulo: "Gerenciar avaliações socioeconômicas",
    descricao: "Permite criar e editar avaliações socioeconômicas.",
  },
  "encaminhamentos.read": {
    modulo: "Serviço Social",
    titulo: "Visualizar encaminhamentos",
    descricao: "Permite consultar encaminhamentos.",
  },
  "encaminhamentos.write": {
    modulo: "Serviço Social",
    titulo: "Gerenciar encaminhamentos",
    descricao: "Permite criar e editar encaminhamentos.",
  },
  "jovem_vagas.read": {
    modulo: "Vínculos de Vaga",
    titulo: "Visualizar vínculos de vaga",
    descricao: "Permite consultar vínculos de jovens com vagas.",
  },
  "jovem_vagas.write": {
    modulo: "Vínculos de Vaga",
    titulo: "Gerenciar vínculos de vaga",
    descricao: "Permite criar e alterar vínculos de jovens com vagas.",
  },
  "projetos.read": {
    modulo: "Projetos",
    titulo: "Visualizar projetos",
    descricao: "Permite consultar projetos.",
  },
  "projetos.write": {
    modulo: "Projetos",
    titulo: "Gerenciar projetos",
    descricao: "Permite criar e editar projetos.",
  },
  "certificacoes.read": {
    modulo: "Certificações",
    titulo: "Visualizar certificações",
    descricao: "Permite consultar certificações.",
  },
  "certificacoes.write": {
    modulo: "Certificações",
    titulo: "Gerenciar certificações",
    descricao: "Permite criar e editar certificações.",
  },
  "conselho_classe.read": {
    modulo: "Conselho de Classe",
    titulo: "Visualizar conselho de classe",
    descricao: "Permite consultar reuniões e registros do conselho de classe.",
  },
  "conselho_classe.write": {
    modulo: "Conselho de Classe",
    titulo: "Gerenciar conselho de classe",
    descricao: "Permite criar e editar reuniões e registros do conselho de classe.",
  },
  "cadastros.read": {
    modulo: "Cadastros",
    titulo: "Visualizar cadastros base",
    descricao: "Permite consultar empresas, unidades e turmas.",
  },
  "cadastros.write": {
    modulo: "Cadastros",
    titulo: "Gerenciar cadastros base",
    descricao: "Permite criar e editar empresas, unidades e turmas.",
  },
  "configuracoes.read": {
    modulo: "Configurações",
    titulo: "Visualizar configurações",
    descricao: "Permite acessar as configurações do sistema.",
  },
  "configuracoes.write": {
    modulo: "Configurações",
    titulo: "Gerenciar configurações",
    descricao: "Permite alterar parâmetros e listas de configuração.",
  },
  "auditoria.read": {
    modulo: "Auditoria",
    titulo: "Visualizar auditoria",
    descricao: "Permite consultar logs de auditoria.",
  },
  "rbac.manage": {
    modulo: "Grupos de Permissão",
    titulo: "Gerenciar grupos de permissão",
    descricao: "Permite criar grupos, marcar permissões e atribuir grupos aos usuários.",
  },
  "menu.setor.psicossocial": {
    modulo: "Menus por Setor",
    titulo: "Exibir menu Psicossocial",
    descricao: "Libera o grupo de navegação do setor Psicossocial.",
  },
  "menu.setor.servico_social": {
    modulo: "Menus por Setor",
    titulo: "Exibir menu Serviço Social",
    descricao: "Libera o grupo de navegação do Serviço Social.",
  },
  "menu.setor.pedagogico": {
    modulo: "Menus por Setor",
    titulo: "Exibir menu Pedagógico",
    descricao: "Libera o grupo de navegação do setor Pedagógico.",
  },
  "menu.setor.vagas": {
    modulo: "Menus por Setor",
    titulo: "Exibir menu Vínculos de Vaga",
    descricao: "Libera o grupo de navegação de vínculos de vaga.",
  },
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  jovens: "Jovens Aprendizes",
  inscricoes: "Banco de Talentos",
  agenda: "Agenda",
  intervencoes: "Psicossocial",
  intervencoes_psicossocial: "Psicossocial",
  atendimentos_servico_social: "Serviço Social",
  avaliacoes_pedagogicas: "Pedagógico",
  avaliacoes_socioeconomicas: "Serviço Social",
  encaminhamentos: "Serviço Social",
  jovem_vagas: "Vínculos de Vaga",
  projetos: "Projetos",
  certificacoes: "Certificações",
  conselho_classe: "Conselho de Classe",
  cadastros: "Cadastros",
  configuracoes: "Configurações",
  auditoria: "Auditoria",
  rbac: "Grupos de Permissão",
  menu: "Menus por Setor",
};

const ACTION_LABELS: Record<string, string> = {
  read: "Visualizar",
  write: "Gerenciar",
  manage: "Gerenciar",
  "status.manage": "Alterar status",
  "setor.psicossocial": "Exibir menu Psicossocial",
  "setor.servico_social": "Exibir menu Serviço Social",
  "setor.pedagogico": "Exibir menu Pedagógico",
  "setor.vagas": "Exibir menu Vínculos de Vaga",
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function humanize(value: string) {
  return value
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPermissionDisplay(permission: PermissionKey): PermissionDisplay {
  const mapped = PERMISSION_DISPLAY[permission.chave];
  if (mapped) return mapped;

  const modulo = MODULE_LABELS[permission.modulo] || humanize(permission.modulo);
  const acao = ACTION_LABELS[permission.acao] || humanize(permission.acao);

  return {
    modulo,
    titulo: `${acao} ${modulo}`,
    descricao: permission.descricao || "Permissão do sistema.",
  };
}

export function PerfisPermissoesTab() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [keys, setKeys] = useState<PermissionKey[]>([]);
  const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [permissionFilter, setPermissionFilter] = useState("");

  const [newGroupNome, setNewGroupNome] = useState("");
  const [newGroupDescricao, setNewGroupDescricao] = useState("");
  const [newGroupSetor, setNewGroupSetor] = useState("");

  const canManage = hasPermission("rbac.manage") || hasPermission("*");

  async function loadData() {
    setLoading(true);
    try {
      const [groupsRes, keysRes, groupItemsRes, assignmentsRes, profilesRes] =
        await Promise.all([
          supabase
            .from("permission_groups" as any)
            .select("id, nome, descricao, setor, ativo")
            .order("nome", { ascending: true }),
          supabase
            .from("permission_keys" as any)
            .select("id, chave, modulo, acao, descricao")
            .eq("ativo", true)
            .order("modulo", { ascending: true }),
          supabase
            .from("permission_group_items" as any)
            .select("id, group_id, permission_key_id"),
          supabase
            .from("user_permission_groups" as any)
            .select("id, user_id, group_id"),
          supabase
            .from("profiles")
            .select("id, email, nome_completo")
            .order("nome_completo", { ascending: true }),
        ]);

      if (groupsRes.error) throw groupsRes.error;
      if (keysRes.error) throw keysRes.error;
      if (groupItemsRes.error) throw groupItemsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const loadedGroups = (groupsRes.data as PermissionGroup[]) ?? [];
      setGroups(loadedGroups);
      setKeys((keysRes.data as PermissionKey[]) ?? []);
      setGroupItems((groupItemsRes.data as GroupItem[]) ?? []);
      setAssignments((assignmentsRes.data as UserAssignment[]) ?? []);
      setProfiles((profilesRes.data as Profile[]) ?? []);

      if (!selectedGroupId && loadedGroups.length > 0) {
        setSelectedGroupId(loadedGroups[0].id);
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao carregar RBAC",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canManage) {
      loadData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const selectedGroupPermissions = useMemo(() => {
    const selected = groupItems
      .filter((item) => item.group_id === selectedGroupId)
      .map((item) => item.permission_key_id);
    return new Set(selected);
  }, [groupItems, selectedGroupId]);

  const permissionRows = useMemo(
    () =>
      keys.map((key) => ({
        ...key,
        display: getPermissionDisplay(key),
      })),
    [keys],
  );

  const filteredPermissionRows = useMemo(() => {
    const term = normalizeSearch(permissionFilter.trim());
    if (!term) return permissionRows;

    return permissionRows.filter((key) => {
      const searchable = normalizeSearch(
        [
          key.chave,
          key.modulo,
          key.acao,
          key.descricao || "",
          key.display.modulo,
          key.display.titulo,
          key.display.descricao,
        ].join(" "),
      );
      return searchable.includes(term);
    });
  }, [permissionFilter, permissionRows]);

  const groupedPermissionRows = useMemo(() => {
    return filteredPermissionRows.reduce(
      (acc, key) => {
        if (!acc[key.display.modulo]) {
          acc[key.display.modulo] = [];
        }
        acc[key.display.modulo].push(key);
        return acc;
      },
      {} as Record<string, typeof filteredPermissionRows>,
    );
  }, [filteredPermissionRows]);

  async function handleCreateGroup() {
    if (!newGroupNome.trim()) return;

    try {
      const { error } = await supabase.from("permission_groups" as any).insert({
        nome: newGroupNome.trim(),
        descricao: newGroupDescricao.trim() || null,
        setor: newGroupSetor || null,
      });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Grupo criado." });
      setNewGroupNome("");
      setNewGroupDescricao("");
      setNewGroupSetor("");
      await loadData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao criar grupo",
        variant: "destructive",
      });
    }
  }

  async function handleTogglePermission(permissionKeyId: string, enabled: boolean) {
    if (!selectedGroupId) return;

    try {
      if (enabled) {
        const { error } = await supabase
          .from("permission_group_items" as any)
          .insert({ group_id: selectedGroupId, permission_key_id: permissionKeyId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("permission_group_items" as any)
          .delete()
          .eq("group_id", selectedGroupId)
          .eq("permission_key_id", permissionKeyId);
        if (error) throw error;
      }

      await loadData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao atualizar permissões",
        variant: "destructive",
      });
    }
  }

  async function handleAssignGroup() {
    if (!selectedGroupId || !selectedUserId) return;

    try {
      const { error } = await supabase
        .from("user_permission_groups" as any)
        .insert({ user_id: selectedUserId, group_id: selectedGroupId });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Grupo atribuído ao usuário." });
      setSelectedUserId("");
      await loadData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao atribuir grupo",
        variant: "destructive",
      });
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    try {
      const { error } = await supabase
        .from("user_permission_groups" as any)
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao remover atribuição",
        variant: "destructive",
      });
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Sem permissão para gerenciar perfis e permissões.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Grupos de Permissão
          </CardTitle>
          <CardDescription>
            Crie grupos e ajuste permissões por módulo/ação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Nome</Label>
              <Input value={newGroupNome} onChange={(e) => setNewGroupNome(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={newGroupDescricao} onChange={(e) => setNewGroupDescricao(e.target.value)} />
            </div>
            <div>
              <Label>Setor</Label>
              <Select value={newGroupSetor} onValueChange={setNewGroupSetor}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="psicossocial">Psicossocial</SelectItem>
                  <SelectItem value="servico_social">Serviço Social</SelectItem>
                  <SelectItem value="pedagogico">Pedagógico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateGroup} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar Grupo
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              <Label>Grupo selecionado</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {groups
                .filter((group) => group.id === selectedGroupId)
                .map((group) => (
                  <div key={group.id} className="text-xs text-muted-foreground space-y-1">
                    {group.descricao ? <p>{group.descricao}</p> : null}
                    {group.setor ? <Badge variant="outline">{group.setor}</Badge> : null}
                  </div>
                ))}
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <Label>Matriz de permissões</Label>
                  <p className="text-xs text-muted-foreground">
                    {selectedGroupPermissions.size} permissões marcadas neste grupo.
                  </p>
                </div>
                <div className="relative md:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={permissionFilter}
                    onChange={(event) => setPermissionFilter(event.target.value)}
                    placeholder="Buscar permissão..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="rounded-md border max-h-[440px] overflow-auto">
                {Object.entries(groupedPermissionRows).map(([modulo, permissions]) => (
                  <div key={modulo} className="border-b last:border-b-0">
                    <div className="sticky top-0 z-10 bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {modulo}
                    </div>
                    <div className="divide-y">
                      {permissions.map((key) => {
                        const checked = selectedGroupPermissions.has(key.id);
                        return (
                          <label
                            key={key.id}
                            className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                handleTogglePermission(key.id, Boolean(value))
                              }
                            />
                            <div className="min-w-0 text-sm">
                              <p className="font-medium leading-none">{key.display.titulo}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {key.display.descricao}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {filteredPermissionRows.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Nenhuma permissão encontrada para a busca informada.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Atribuição de Grupos aos Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label>Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione usuário" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.nome_completo} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grupo</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAssignGroup}>Atribuir</Button>
            </div>
          </div>

          <div className="rounded-md border divide-y">
            {assignments.map((assignment) => {
              const user = profiles.find((profile) => profile.id === assignment.user_id);
              const group = groups.find((item) => item.id === assignment.group_id);

              return (
                <div key={assignment.id} className="flex items-center justify-between p-3 gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{user?.nome_completo || assignment.user_id}</p>
                    <p className="text-muted-foreground">{user?.email || "Sem email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{group?.nome || "Grupo"}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {assignments.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma atribuição cadastrada.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
