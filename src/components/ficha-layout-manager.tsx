"use client";

import React, { useState } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, setDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { FichaLayout } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Save,
  BookOpen,
  ListOrdered,
  Layers,
  MoveUp,
  MoveDown,
  RefreshCw,
  Layout
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const STANDARD_CATEGORIES = [
  {
    titulo: "1 - Aproveitamento",
    itens: [
      "Aprendizagem dos conteúdos propostos",
      "Concentração",
      "Interesse nas aulas",
      "Interpretação das aulas",
      "Capacidade de inter-relacionar conteúdos",
      "Capacidade de expressão oral",
      "Capacidade de expressão escrita",
      "Capacidade em operações numéricas",
      "Hábito de estudar",
      "Capacidade de atuar em equipe"
    ]
  },
  {
    titulo: "2 - Atitudes",
    itens: [
      "Disciplina",
      "Respeito com colegas/professores/funcionários",
      "Assiduidade",
      "Cooperação",
      "Capacidade de entender/aceitar as orientações dadas"
    ]
  },
  {
    titulo: "3 - Participação",
    itens: [
      "Atenção às aulas",
      "Manifestação de dúvidas",
      "Cumprimento das lições de casa",
      "Cumprimento das lições em sala",
      "Organização",
      "Está sempre com o material completo"
    ]
  }
];

const STANDARD_SUGGESTIONS = [
  "Melhorar a postura em sala de aula",
  "Melhorar a organização",
  "Fazer as lições/trabalhos propostos",
  "Cumprir prazos estabelecidos pelos professores",
  "Ter mais empenho",
  "Conversar menos",
  "Melhorar ortografia"
];

const DEFAULT_MODELS: Partial<FichaLayout>[] = [
  {
    id: "layout-trimestral",
    nome: "Trimestral Padrão",
    tipo: "TRIMESTRAL",
    colunas: [
      { id: "t1", nome: "1º Trimestre" },
      { id: "t2", nome: "2º Trimestre" },
      { id: "t3", nome: "3º Trimestre" }
    ],
    categorias: STANDARD_CATEGORIES,
    sugestoes: STANDARD_SUGGESTIONS
  },
  {
    id: "layout-1em",
    nome: "1º EM (Disciplinas)",
    tipo: "DISCIPLINAR",
    colunas: [
      { id: "mat", nome: "Mat" },
      { id: "fisic", nome: "Física" },
      { id: "quim", nome: "Quím" },
      { id: "biol", nome: "Biol" },
      { id: "hist", nome: "Hist" },
      { id: "geo", nome: "Geo" },
      { id: "port", nome: "Port" },
      { id: "ingl", nome: "Ingl" },
      { id: "filos", nome: "Filos" },
      { id: "soc", nome: "Soc" },
      { id: "ef", nome: "EF" },
      { id: "art", nome: "Ed. Artic" }
    ],
    categorias: STANDARD_CATEGORIES,
    sugestoes: STANDARD_SUGGESTIONS
  },
  {
    id: "layout-6ano",
    nome: "6º Ano (Disciplinas)",
    tipo: "DISCIPLINAR",
    colunas: [
      { id: "mat", nome: "Mat" },
      { id: "port", nome: "Port" },
      { id: "ingl", nome: "Ingl" },
      { id: "hist", nome: "Hist" },
      { id: "geo", nome: "Geo" },
      { id: "cien", nome: "Ciên" },
      { id: "red", nome: "Red" },
      { id: "arte", nome: "Arte" },
      { id: "ef", nome: "EF" },
      { id: "mel", nome: "Mel" }
    ],
    categorias: STANDARD_CATEGORIES,
    sugestoes: STANDARD_SUGGESTIONS
  },
  {
    id: "layout-7ano",
    nome: "7º Ano (Disciplinas)",
    tipo: "DISCIPLINAR",
    colunas: [
      { id: "mat", nome: "Mat" },
      { id: "port", nome: "Port" },
      { id: "ingl", nome: "Ingl" },
      { id: "hist", nome: "Hist" },
      { id: "geo", nome: "Geo" },
      { id: "cien", nome: "Ciên" },
      { id: "dg", nome: "DG" },
      { id: "red", nome: "Red" },
      { id: "arte", nome: "Arte" },
      { id: "ef", nome: "EF" }
    ],
    categorias: STANDARD_CATEGORIES,
    sugestoes: STANDARD_SUGGESTIONS
  },
  {
    id: "layout-8ano",
    nome: "8º Ano (Disciplinas)",
    tipo: "DISCIPLINAR",
    colunas: [
      { id: "mat", nome: "Mat" },
      { id: "port", nome: "Port" },
      { id: "ingl", nome: "Ingl" },
      { id: "hist", nome: "Hist" },
      { id: "geo", nome: "Geo" },
      { id: "fisic", nome: "Físic" },
      { id: "bio", nome: "Bio" },
      { id: "dg", nome: "DG" },
      { id: "red", nome: "Red" },
      { id: "arte", nome: "Arte" },
      { id: "ef", nome: "EF" }
    ],
    categorias: STANDARD_CATEGORIES,
    sugestoes: STANDARD_SUGGESTIONS
  },
  {
    id: "layout-3em",
    nome: "3º EM (Disciplinas)",
    tipo: "DISCIPLINAR",
    colunas: [
      { id: "mat", nome: "Mat" },
      { id: "fisic", nome: "Física" },
      { id: "quim", nome: "Quím" },
      { id: "biol", nome: "Biol" },
      { id: "hist", nome: "Hist" },
      { id: "geo", nome: "Geo" },
      { id: "port", nome: "Port" },
      { id: "ingl", nome: "Ingl" },
      { id: "filos", nome: "Filos" },
      { id: "soc", nome: "Soc" },
      { id: "ef", nome: "EF" },
      { id: "am", nome: "A/M" }
    ],
    categorias: STANDARD_CATEGORIES,
    sugestoes: STANDARD_SUGGESTIONS
  }
];

export default function FichaLayoutManager() {
  const firestore = useFirestore();
  const layoutsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'fichas_layouts'), orderBy('nome', 'asc')) : null, [firestore]);
  const { data: layoutsData, isLoading } = useCollection<FichaLayout>(layoutsQuery);

  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [editingLayout, setEditingLayout] = useState<Partial<FichaLayout> | null>(null);
  const [isUpdatingDefaults, setIsUpdatingDefaults] = useState(false);

  const handleCreateNew = () => {
    const newLayout: Partial<FichaLayout> = {
      nome: "Novo Modelo",
      tipo: "DISCIPLINAR",
      colunas: [{ id: "nova", nome: "Nova Coluna" }],
      categorias: STANDARD_CATEGORIES,
      sugestoes: STANDARD_SUGGESTIONS
    };
    setEditingLayout(newLayout);
    setSelectedLayoutId("new");
  };

  const handleEdit = (layout: FichaLayout) => {
    setEditingLayout({ ...layout });
    setSelectedLayoutId(layout.id);
  };

  const handleSave = async () => {
    if (!firestore || !editingLayout || !editingLayout.nome) {
      toast({ title: "Preencha o nome do modelo.", variant: "destructive" });
      return;
    }

    try {
      const id = selectedLayoutId === "new" ? doc(collection(firestore, 'fichas_layouts')).id : selectedLayoutId!;
      await setDoc(doc(firestore, 'fichas_layouts', id), {
        ...editingLayout,
        id,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({ title: "Modelo salvo com sucesso!" });
      setSelectedLayoutId(null);
      setEditingLayout(null);
    } catch (e) {
      toast({ title: "Erro ao salvar modelo.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'fichas_layouts', id));
      toast({ title: "Modelo excluído." });
      if (selectedLayoutId === id) {
        setSelectedLayoutId(null);
        setEditingLayout(null);
      }
    } catch (e) {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    }
  };

  const syncDefaults = async () => {
    if (!firestore) return;
    if (!confirm("Deseja carregar/atualizar os 6 modelos padrão (Trimestral e Disciplinares)?")) return;

    setIsUpdatingDefaults(true);
    try {
      for (const model of DEFAULT_MODELS) {
        await setDoc(doc(firestore, 'fichas_layouts', model.id!), {
          ...model,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      toast({ title: "Modelos padrão sincronizados!" });
    } catch (e) {
      toast({ title: "Erro ao sincronizar.", variant: "destructive" });
    } finally {
      setIsUpdatingDefaults(false);
    }
  };

  const addColumn = () => {
    if (!editingLayout) return;
    const newCols = [...(editingLayout.colunas || []), { id: `col-${Date.now()}`, nome: "Nova Disciplina" }];
    setEditingLayout({ ...editingLayout, colunas: newCols });
  };

  const removeColumn = (idx: number) => {
    if (!editingLayout) return;
    const newCols = [...(editingLayout.colunas || [])];
    newCols.splice(idx, 1);
    setEditingLayout({ ...editingLayout, colunas: newCols });
  };

  const moveColumn = (idx: number, direction: 'up' | 'down') => {
    if (!editingLayout || !editingLayout.colunas) return;
    const newCols = [...editingLayout.colunas];
    if (direction === 'up' && idx > 0) {
      [newCols[idx], newCols[idx - 1]] = [newCols[idx - 1], newCols[idx]];
    } else if (direction === 'down' && idx < newCols.length - 1) {
      [newCols[idx], newCols[idx + 1]] = [newCols[idx + 1], newCols[idx]];
    }
    setEditingLayout({ ...editingLayout, colunas: newCols });
  };

  if (isLoading) return <div className="p-8 text-center">Carregando layouts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><Layout className="text-primary" /> Modelos de Fichas</h3>
          <p className="text-xs text-muted-foreground">Configure as disciplinas e categorias de cada tipo de ficha.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncDefaults} disabled={isUpdatingDefaults} className="gap-2">
            <RefreshCw size={14} className={isUpdatingDefaults ? "animate-spin" : ""} /> Carregar Padrões
          </Button>
          <Button size="sm" onClick={handleCreateNew} className="gap-2">
            <Plus size={14} /> Novo Modelo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista de Modelos */}
        <div className="col-span-1 space-y-3">
          {(layoutsData || []).map(layout => (
            <Card
              key={layout.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                selectedLayoutId === layout.id ? "border-primary bg-primary/5 shadow-md" : "bg-card"
              )}
              onClick={() => handleEdit(layout)}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{layout.nome}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">{layout.tipo === 'TRIMESTRAL' ? 'Por Período' : 'Por Disciplina'}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-[10px]">{layout.colunas.length} col</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(layout.id); }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Editor de Modelo */}
        <div className="col-span-1 md:col-span-2">
          {editingLayout ? (
            <Card className="border-2 border-primary/20 shadow-xl animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2"><Plus size={18} /> {selectedLayoutId === 'new' ? 'Novo Modelo' : 'Editar Modelo'}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedLayoutId(null); setEditingLayout(null); }}>Cancelar</Button>
                    <Button size="sm" onClick={handleSave} className="gap-2 bg-green-600 hover:bg-green-700">
                      <Save size={14} /> Salvar Modelo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Modelo</Label>
                    <Input value={editingLayout.nome} onChange={(e) => setEditingLayout({ ...editingLayout, nome: e.target.value })} placeholder="Ex: Fundamental I (Disciplinas)" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Layout</Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant={editingLayout.tipo === 'TRIMESTRAL' ? 'default' : 'outline'}
                        size="sm" className="flex-1 text-xs"
                        onClick={() => setEditingLayout({ ...editingLayout, tipo: 'TRIMESTRAL' })}>Períodos (Trimestres)</Button>
                      <Button
                        variant={editingLayout.tipo === 'DISCIPLINAR' ? 'default' : 'outline'}
                        size="sm" className="flex-1 text-xs"
                        onClick={() => setEditingLayout({ ...editingLayout, tipo: 'DISCIPLINAR' })}>Disciplinas (Mat, Port...)</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><ListOrdered size={14} /> Colunas (Disciplinas ou Períodos)</Label>
                    <Button variant="outline" size="sm" onClick={addColumn} className="h-7 text-[10px] gap-1">
                      <Plus size={12} /> Adicionar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 pr-2 scrollbar-thin">
                    {(editingLayout.colunas || []).map((col, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-muted/20 p-2 rounded-lg border group animate-in zoom-in-95 duration-150">
                        <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100">
                          <button onClick={() => moveColumn(idx, 'up')} className="hover:text-primary"><MoveUp size={12} /></button>
                          <button onClick={() => moveColumn(idx, 'down')} className="hover:text-primary"><MoveDown size={12} /></button>
                        </div>
                        <Input
                          value={col.nome}
                          className="h-8 text-xs font-medium"
                          onChange={(e) => {
                            const newCols = [...(editingLayout.colunas || [])];
                            newCols[idx] = { ...col, nome: e.target.value };
                            setEditingLayout({ ...editingLayout, colunas: newCols });
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeColumn(idx)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {editingLayout.colunas?.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                      Nenhuma coluna adicionada. Clique em Adicionar acima.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-muted/10 text-muted-foreground">
              <Layers size={48} className="mb-4 opacity-20" />
              <p className="font-bold">Selecione um modelo para editar</p>
              <p className="text-xs">Ou clique em "Novo Modelo" para criar um do zero.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
