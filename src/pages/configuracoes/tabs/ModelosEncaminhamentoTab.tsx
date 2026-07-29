import { useState } from "react";
import { Plus, Pencil, Loader2, ToggleLeft, ToggleRight, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useModelosEncaminhamento, useMutateModeloEncaminhamento, ModeloEncaminhamento } from "@/hooks/useConfiguracoes";

export function ModelosEncaminhamentoTab() {
  const [showAll, setShowAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModeloEncaminhamento | null>(null);
  const [previewItem, setPreviewItem] = useState<ModeloEncaminhamento | null>(null);
  
  const { data: modelos, isLoading } = useModelosEncaminhamento(!showAll);
  const { create, update } = useMutateModeloEncaminhamento();

  const [formData, setFormData] = useState({
    nome: "",
    instituicao_destino: "",
    area_destino: "",
    corpo_template: "",
    ativo: true,
    ordem: 0,
  });

  const resetForm = () => {
    setFormData({ 
      nome: "", 
      instituicao_destino: "", 
      area_destino: "", 
      corpo_template: "",
      ativo: true, 
      ordem: 0 
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: ModeloEncaminhamento) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        instituicao_destino: item.instituicao_destino || "",
        area_destino: item.area_destino || "",
        corpo_template: item.corpo_template || "",
        ativo: item.ativo,
        ordem: item.ordem,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handlePreview = (item: ModeloEncaminhamento) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  };

  const handleSubmit = async () => {
    if (editingItem) {
      await update.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await create.mutateAsync(formData);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleToggleAtivo = async (item: ModeloEncaminhamento) => {
    await update.mutateAsync({ id: item.id, ativo: !item.ativo });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">
            Modelos de Encaminhamento
            <Badge variant="secondary" className="ml-2">
              {modelos?.length || 0} modelos
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-all-modelos"
                checked={showAll}
                onCheckedChange={setShowAll}
              />
              <Label htmlFor="show-all-modelos" className="text-sm text-muted-foreground">
                Mostrar inativos
              </Label>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Modelo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Editar Modelo" : "Novo Modelo de Encaminhamento"}
                  </DialogTitle>
                  <DialogDescription>
                    Crie templates reutilizáveis para agilizar a geração de encaminhamentos.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <Label htmlFor="nome">Nome do modelo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Encaminhamento para CAPS"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="instituicao_destino">Instituição de destino</Label>
                      <Input
                        id="instituicao_destino"
                        value={formData.instituicao_destino}
                        onChange={(e) => setFormData({ ...formData, instituicao_destino: e.target.value })}
                        placeholder="Ex: Centro de Atenção Psicossocial"
                      />
                    </div>
                    <div>
                      <Label htmlFor="area_destino">Área/Setor</Label>
                      <Input
                        id="area_destino"
                        value={formData.area_destino}
                        onChange={(e) => setFormData({ ...formData, area_destino: e.target.value })}
                        placeholder="Ex: Saúde Mental"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="corpo_template">Corpo do template</Label>
                    <Textarea
                      id="corpo_template"
                      value={formData.corpo_template}
                      onChange={(e) => setFormData({ ...formData, corpo_template: e.target.value })}
                      placeholder="Digite o texto base do encaminhamento. Use [CAMPO] para indicar campos a serem preenchidos..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Dica: Use marcadores como [DESCREVER MOTIVO] para indicar campos que devem ser preenchidos.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ordem">Ordem de exibição</Label>
                      <Input
                        id="ordem"
                        type="number"
                        value={formData.ordem}
                        onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        id="ativo"
                        checked={formData.ativo}
                        onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                      />
                      <Label htmlFor="ativo">Modelo ativo</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!formData.nome || create.isPending || update.isPending}
                  >
                    {(create.isPending || update.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingItem ? "Salvar" : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Ordem</TableHead>
                  <TableHead>Nome do Modelo</TableHead>
                  <TableHead className="hidden md:table-cell">Instituição</TableHead>
                  <TableHead className="hidden md:table-cell">Área</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelos?.map((modelo) => (
                  <TableRow key={modelo.id} className={!modelo.ativo ? "opacity-50" : ""}>
                    <TableCell className="text-muted-foreground">{modelo.ordem}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {modelo.nome}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {modelo.instituicao_destino}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {modelo.area_destino && (
                        <Badge variant="outline">{modelo.area_destino}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={modelo.ativo ? "default" : "secondary"}>
                        {modelo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(modelo)}
                          title="Visualizar template"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleAtivo(modelo)}
                          title={modelo.ativo ? "Desativar" : "Ativar"}
                        >
                          {modelo.ativo ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(modelo)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!modelos || modelos.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum modelo de encaminhamento cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {previewItem?.nome}
            </DialogTitle>
            <DialogDescription>
              Visualização do template de encaminhamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Instituição:</span>
                <p className="font-medium">{previewItem?.instituicao_destino || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Área:</span>
                <p className="font-medium">{previewItem?.area_destino || "-"}</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Corpo do template:</span>
              <div className="mt-2 p-4 bg-muted/50 rounded-lg border">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {previewItem?.corpo_template || "Sem conteúdo definido."}
                </pre>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setPreviewOpen(false);
              if (previewItem) handleOpenDialog(previewItem);
            }}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
