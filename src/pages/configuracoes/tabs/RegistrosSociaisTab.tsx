import { useState } from "react";
import { Plus, Pencil, Loader2, ToggleLeft, ToggleRight, Building2 } from "lucide-react";
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
import { useRegistrosSociais, useMutateRegistroSocial, RegistroSocial } from "@/hooks/useConfiguracoes";

export function RegistrosSociaisTab() {
  const [showAll, setShowAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RegistroSocial | null>(null);
  
  const { data: registros, isLoading } = useRegistrosSociais(!showAll);
  const { create, update } = useMutateRegistroSocial();

  const [formData, setFormData] = useState({
    nome: "",
    sigla: "",
    descricao: "",
    ativo: true,
    ordem: 0,
  });

  const resetForm = () => {
    setFormData({ nome: "", sigla: "", descricao: "", ativo: true, ordem: 0 });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: RegistroSocial) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        sigla: item.sigla || "",
        descricao: item.descricao || "",
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

  const handleToggleAtivo = async (item: RegistroSocial) => {
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
          Tipos de Registros Sociais
          <Badge variant="secondary" className="ml-2">
            {registros?.length || 0} itens
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-all-registros"
              checked={showAll}
              onCheckedChange={setShowAll}
            />
            <Label htmlFor="show-all-registros" className="text-sm text-muted-foreground">
              Mostrar inativos
            </Label>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Registro Social" : "Novo Tipo de Registro Social"}
                </DialogTitle>
                <DialogDescription>
                  Configure tipos de registros sociais institucionais como CMAS, CMDCA, CRAS, etc.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Conselho Municipal de Assistência Social"
                  />
                </div>
                <div>
                  <Label htmlFor="sigla">Sigla</Label>
                  <Input
                    id="sigla"
                    value={formData.sigla}
                    onChange={(e) => setFormData({ ...formData, sigla: e.target.value })}
                    placeholder="Ex: CMAS"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição do órgão/registro..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="ordem">Ordem de exibição</Label>
                  <Input
                    id="ordem"
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                  />
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
                <TableHead className="w-[80px]">Sigla</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros?.map((registro) => (
                <TableRow key={registro.id} className={!registro.ativo ? "opacity-50" : ""}>
                  <TableCell className="text-muted-foreground">{registro.ordem}</TableCell>
                  <TableCell>
                    {registro.sigla && (
                      <Badge variant="outline" className="font-mono">
                        {registro.sigla}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{registro.nome}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                    {registro.descricao}
                  </TableCell>
                  <TableCell>
                    <Badge variant={registro.ativo ? "default" : "secondary"}>
                      {registro.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAtivo(registro)}
                        title={registro.ativo ? "Desativar" : "Ativar"}
                      >
                        {registro.ativo ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(registro)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!registros || registros.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum tipo de registro social cadastrado.
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
