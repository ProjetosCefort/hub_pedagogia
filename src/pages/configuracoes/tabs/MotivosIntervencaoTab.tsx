import { useState } from "react";
import { Plus, Pencil, Check, X, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
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
import { useMotivosIntervencao, useMutateMotivoIntervencao, MotivoIntervencao } from "@/hooks/useConfiguracoes";

export function MotivosIntervencaoTab() {
  const [showAll, setShowAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MotivoIntervencao | null>(null);
  
  const { data: motivos, isLoading } = useMotivosIntervencao(!showAll, "psicossocial");
  const { create, update } = useMutateMotivoIntervencao();

  const [formData, setFormData] = useState<{
    nome: string;
    descricao: string;
    categoria: string;
    setor: "psicossocial" | "servico_social";
    ativo: boolean;
    ordem: number;
  }>({
    nome: "",
    descricao: "",
    categoria: "",
    setor: "psicossocial",
    ativo: true,
    ordem: 0,
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      categoria: "",
      setor: "psicossocial",
      ativo: true,
      ordem: 0,
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: MotivoIntervencao) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        descricao: item.descricao || "",
        categoria: item.categoria || "",
        setor: item.setor || "psicossocial",
        ativo: item.ativo,
        ordem: item.ordem,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
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

  const handleToggleAtivo = async (item: MotivoIntervencao) => {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium">
          Motivos de Intervenção
          <Badge variant="secondary" className="ml-2">
            {motivos?.length || 0} itens
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-all"
              checked={showAll}
              onCheckedChange={setShowAll}
            />
            <Label htmlFor="show-all" className="text-sm text-muted-foreground">
              Mostrar inativos
            </Label>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Motivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Motivo" : "Novo Motivo de Intervenção"}
                </DialogTitle>
                <DialogDescription>
                  Este motivo estará disponível para seleção nas intervenções do módulo Psicossocial.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Atraso/Falta"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição detalhada do motivo..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input
                      id="categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      placeholder="Ex: Frequência"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ordem">Ordem</Label>
                    <Input
                      id="ordem"
                      type="number"
                      value={formData.ordem}
                      onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
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
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motivos?.map((motivo) => (
                <TableRow key={motivo.id} className={!motivo.ativo ? "opacity-50" : ""}>
                  <TableCell className="text-muted-foreground">{motivo.ordem}</TableCell>
                  <TableCell className="font-medium">{motivo.nome}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {motivo.categoria && (
                      <Badge variant="outline">{motivo.categoria}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                    {motivo.descricao}
                  </TableCell>
                  <TableCell>
                    <Badge variant={motivo.ativo ? "default" : "secondary"}>
                      {motivo.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAtivo(motivo)}
                        title={motivo.ativo ? "Desativar" : "Ativar"}
                      >
                        {motivo.ativo ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(motivo)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!motivos || motivos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum motivo cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
