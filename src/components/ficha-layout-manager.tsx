"use client";

import React, { useState } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, setDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { FichaLayout, HeaderField, FieldStyle } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, Trash2, Save, BookOpen, ListOrdered, Layers, MoveUp, MoveDown, RefreshCw, Layout, Info, Type, CheckCircle2,
  Settings2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette, Eye, EyeOff, Loader2, Move, ExternalLink, GripVertical
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SelectionId = 'header' | 'logo' | 'tabela' | 'tabela-header' | 'legend' | 'sugestoes' | 'verso' | 'verso-title' | 'verso-period' | string;


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

const STANDARD_COLUMNS = [
  { id: "t1", nome: "1º Trim" },
  { id: "t2", nome: "2º Trim" },
  { id: "t3", nome: "3º Trim" }
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

const DEFAULT_HEADER_FIELDS: HeaderField[] = [
  { id: 'nome', label: 'Nome do Aluno(a)', enabled: true, colSpan: 3, style: { bold: true, italic: false, alignment: 'left', fontSize: 13, color: '#000000', x: 0, y: 0, width: 140, height: 8 } },
  { id: 'matricula', label: 'Matrícula', enabled: true, colSpan: 1, style: { bold: false, italic: false, alignment: 'left', fontSize: 12, color: '#000000', x: 145, y: 0, width: 45, height: 8 } },
  { id: 'numeroChamada', label: 'Nº Chamada', enabled: false, colSpan: 1, style: { bold: false, italic: false, alignment: 'left', fontSize: 12, color: '#000000', x: 0, y: 8, width: 30, height: 8 } },
  { id: 'turma', label: 'Turma', enabled: true, colSpan: 2, style: { bold: false, italic: false, alignment: 'left', fontSize: 12, color: '#000000', x: 35, y: 8, width: 60, height: 8 } },
  { id: 'professor', label: 'Professor(a)', enabled: true, colSpan: 2, style: { bold: false, italic: false, alignment: 'left', fontSize: 12, color: '#000000', x: 100, y: 8, width: 90, height: 8 } }
];

/**
 * COMPONENTE DE PREVIEW MINIATURA (ESTÁTICO)
 */
function MiniFichaPreview({ 
  layout, 
  side = 'frente'
}: { 
  layout: Partial<FichaLayout> | null; 
  side?: 'frente' | 'verso';
}) {
  if (!layout) return null;

  const scaledWidth = 350;
  const scaledHeight = 495;
  const scale = scaledWidth / 850;

  const headerTitle = layout?.headerStyle?.fontSize ? "Ficha Individual" : (layout?.nome || "Ficha Individual");
  const columns = (layout?.colunas && layout.colunas.length > 0) ? layout.colunas : STANDARD_COLUMNS;
  const categories = (layout?.categorias && layout.categorias.length > 0) ? layout.categorias : STANDARD_CATEGORIES;
  const headerFields = (layout?.headerFields && layout.headerFields.length > 0) ? layout.headerFields : DEFAULT_HEADER_FIELDS;

  if (side === 'frente') {
    return (
      <div className="overflow-hidden border border-black shadow-2xl rounded-sm bg-white select-none shrink-0" style={{ width: scaledWidth, height: scaledHeight }}>
        <div className="w-[210mm] h-[297mm] bg-white p-4 flex flex-col origin-top-left relative" style={{ transform: `scale(${scale})` }}>
          
          {/* CABEÇALHO */}
          <div 
            className="flex border-b-2 border-primary pb-2 items-center gap-4 transition-all p-1 rounded-sm"
            style={{ paddingBottom: '8px' }}
          >
            <div 
              className="bg-gray-100 rounded shrink-0 flex items-center justify-center text-[6px] border border-dashed border-gray-300 transition-colors"
              style={{ 
                height: `${layout?.logoHeight || 48}px`, 
                width: `${layout?.logoWidth || 120}px`
              }}
            >
              LOGO ESCOLA
            </div>
            <div 
               className="text-center tracking-tighter transition-all p-1 rounded-sm flex-1"
               style={{ 
                 fontSize: `${layout?.headerStyle?.fontSize || 20}px`,
                 fontWeight: layout?.headerStyle?.bold ? 'bold' : 'normal',
                 fontStyle: layout?.headerStyle?.italic ? 'italic' : 'normal',
                 color: layout?.headerStyle?.color || 'inherit',
                 textAlign: layout?.headerStyle?.alignment || 'center'
               }}
            >
              {headerTitle}
            </div>
          </div>

          <div className="w-full border-2 border-black my-2 font-sans text-[8px] flex flex-col">
            <div className="flex border-b-2 border-black w-full">
              <div className="flex-1 p-1 border-r-2 border-black px-2 flex items-center gap-1">
                <span className="font-bold text-[#4472c4]">Nome do Aluno(a):</span>
                <span className="font-semibold italic opacity-40">...</span>
              </div>
              <div className="w-[80px] p-1 px-2 flex items-center gap-1">
                <span className="font-bold text-[#4472c4]">Ano:</span>
                <span className="font-semibold italic opacity-40">...</span>
              </div>
            </div>
            <div className="flex p-1 px-2 items-center gap-1">
                <span className="font-bold text-[#4472c4]">Professoras:</span>
                <span className="font-semibold italic opacity-40">...</span>
            </div>
          </div>

          {/* LEGENDA */}
          <div className="flex justify-start items-center gap-4 my-2 px-1 text-[8px] font-bold">
              <span className="text-[#4472c4]">Legenda:</span>
              <div className="flex gap-4 items-center">
                 <div className="flex items-center gap-1"><div className="w-6 h-3 bg-[#8B4513] border border-black" /> <span>Baixo</span></div>
                 <div className="flex items-center gap-1">
                    <div className="w-6 h-3 border border-black overflow-hidden relative"><div className="absolute inset-0 bg-[#8B4513] w-1/2" /><div className="absolute inset-0 bg-[#228B22] left-1/2" /></div>
                    <span>Médio</span>
                 </div>
                 <div className="flex items-center gap-1"><div className="w-6 h-3 bg-[#228B22] border border-black" /> <span>Alto</span></div>
              </div>
          </div>

          {/* TABELA REALISTA */}
          <div 
            className="flex flex-col transition-all rounded-sm p-1"
          >
             <table className="w-full border-collapse border border-black text-inherit">
                <thead>
                   <tr 
                      className="bg-gray-50 uppercase font-black transition-all" 
                      style={{ 
                        fontSize: `${layout?.tabelaHeaderStyle?.fontSize || 8}px`,
                        fontWeight: layout?.tabelaHeaderStyle?.bold ? 'bold' : 'normal',
                        fontStyle: layout?.tabelaHeaderStyle?.italic ? 'italic' : 'normal',
                        color: layout?.tabelaHeaderStyle?.color || 'inherit',
                        textAlign: layout?.tabelaHeaderStyle?.alignment || 'center'
                      }}
                   >
                      <th className="border border-black p-1 text-left w-1/2">Itens de Avaliação</th>
                      {columns.map(col => (
                        <th key={col.id} className="border border-black p-1 text-center">{col.nome}</th>
                      ))}
                   </tr>
                </thead>
                <tbody 
                  style={{ 
                    fontSize: `${layout?.tabelaStyle?.fontSize || 9}px`,
                    fontWeight: layout?.tabelaStyle?.bold ? 'bold' : 'normal',
                    fontStyle: layout?.tabelaStyle?.italic ? 'italic' : 'normal',
                    color: layout?.tabelaStyle?.color || 'inherit'
                  }}
                >
                   {categories.slice(0, 3).map((cat, cIdx) => (
                     <React.Fragment key={cIdx}>
                        <tr className="bg-primary/5 font-bold">
                           <td colSpan={columns.length + 1} className="border border-black p-1 uppercase" style={{ fontSize: '0.9em' }}>{cat.titulo}</td>
                        </tr>
                        {cat.itens.slice(0, 2).map((item, iIdx) => (
                           <tr key={iIdx}>
                              <td className="border border-black p-1 truncate max-w-[150px]" style={{ fontSize: '0.9em' }}>{item}</td>
                              {columns.map(col => (
                                <td key={col.id} className="border border-black p-0.5 text-center">
                                   <div className="w-2.5 h-2.5 rounded-full bg-gray-300 mx-auto" />
                                </td>
                              ))}
                           </tr>
                        ))}
                     </React.Fragment>
                   ))}
                </tbody>
             </table>
          </div>

          {/* SUGESTOES PREVIEW */}
          {layout?.showSugestoesFrente && (
            <div 
              className="p-2 border border-dashed transition-all rounded-sm my-2"
              style={{ 
                fontWeight: layout?.suggestionsStyle?.bold ? 'bold' : 'normal',
                fontStyle: layout?.suggestionsStyle?.italic ? 'italic' : 'normal',
                color: layout?.suggestionsStyle?.color || 'inherit',
                fontSize: `${layout?.suggestionsStyle?.fontSize || 10}px`
              }}
            >
                <p className="font-bold border-b border-black mb-1 uppercase tracking-tighter" style={{ fontSize: '0.9em' }}>Sugestões do Professor</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 border border-black" /> <span className="text-[8px]">Opção Marcada</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 border border-black" /> <span className="text-[8px]">Opção Desmarcada</span></div>
                </div>
            </div>
          )}

          {/* RODAPÉ (ASSINATURAS FRENTE) */}
          <div className="font-bold transition-all w-full mt-auto pt-6 flex justify-around">
            {(layout?.assinaturas || ["Professor(a)", "Coordenação", "Responsável"]).map((sig, idx) => (
              <div 
                key={idx} 
                className="border-t border-black pt-1 transition-all p-1 text-center w-[30%]"
                style={{
                  fontSize: `${(layout.signatureStyles?.[idx]?.fontSize || layout.assinaturasStyle?.fontSize || 8)}px`,
                  fontWeight: (layout.signatureStyles?.[idx]?.bold !== undefined ? layout.signatureStyles[idx].bold : (layout.assinaturasStyle?.bold !== false)) ? 'bold' : 'normal',
                  fontStyle: (layout.signatureStyles?.[idx]?.italic !== undefined ? layout.signatureStyles[idx].italic : (layout.assinaturasStyle?.italic || false)) ? 'italic' : 'normal',
                  color: layout.signatureStyles?.[idx]?.color || layout.assinaturasStyle?.color || 'inherit'
                }}
              >
                {sig}
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // PREVIEW DO VERSO
  const periods = layout?.backPeriodsCount || 3;
  const spacing = (layout?.backItemSpacing || 40) * scale; 

  return (
    <div className="overflow-hidden border border-black shadow-2xl rounded-sm bg-white select-none shrink-0" style={{ width: scaledWidth, height: scaledHeight }}>
      <div className="w-[210mm] h-[297mm] bg-white p-12 flex flex-col origin-top-left relative" style={{ transform: `scale(${scale})` }}>
        <h2 
          className="font-bold text-center uppercase underline underline-offset-8 decoration-1 transition-all p-2 rounded-lg mb-6"
          style={{ 
            fontSize: `${layout?.versoTitleStyle?.fontSize || 20}px`,
            fontWeight: layout?.versoTitleStyle?.bold !== false ? 'bold' : 'normal',
            fontStyle: layout?.versoTitleStyle?.italic ? 'italic' : 'normal',
            color: layout?.versoTitleStyle?.color || 'inherit'
          }}
        >
          {layout?.backTitle || "Considerações Finais"}
        </h2>
        
        <div 
          className="flex flex-col flex-1"
          style={{
            fontSize: `${layout?.versoStyle?.fontSize || 16}px`,
            fontWeight: layout?.versoStyle?.bold ? 'bold' : 'normal',
            fontStyle: layout?.versoStyle?.italic ? 'italic' : 'normal',
            color: layout?.versoStyle?.color || 'inherit'
          }}
        >
          {Array.from({ length: periods }).map((_, i) => (
            <div key={i} className="flex flex-col mb-8 shrink-0">
              <h3 
                className="font-bold mb-2 border-l-4 border-primary pl-4 transition-all" 
                style={{ 
                  fontSize: `${(layout?.versoPeriodStyle?.fontSize || 16)}px`,
                  fontWeight: layout?.versoPeriodStyle?.bold !== false ? 'bold' : 'normal',
                  fontStyle: layout?.versoPeriodStyle?.italic ? 'italic' : 'normal',
                  color: layout?.versoPeriodStyle?.color || 'inherit'
                }}
              >
                 Considerações do {i+1}º Período Letivo
              </h3>
              <div 
                className="w-full border border-gray-300 relative bg-white shadow-sm" 
                style={{ height: `${(layout?.backLinesCount || 6) * (layout?.backLineHeight || 32) * scale * 2}px` }}
              >
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(transparent, transparent ${(layout?.backLineHeight || 32)*scale*2 - 1}px, black ${(layout?.backLineHeight || 32)*scale*2 - 1}px, black ${(layout?.backLineHeight || 32)*scale*2}px)` }}></div>
              </div>

              <div className="flex justify-between mt-4">
                 {(layout?.assinaturas || ["Professor(a)", "Coordenação", "Responsável"]).map((sig, sIdx) => {
                    const sigKey = `p${i}-s${sIdx}`;
                    const customStyle = layout.signatureStyles?.[sigKey] || layout.assinaturasStyle || {};
                    return (
                      <div 
                        key={sIdx}
                        className="w-[30%] border-t border-black text-center pt-1 transition-all p-1 rounded"
                        style={{
                          fontSize: `${customStyle.fontSize || 10}px`,
                          fontWeight: customStyle.bold !== false ? 'bold' : 'normal',
                          fontStyle: customStyle.italic ? 'italic' : 'normal',
                          color: customStyle.color || 'inherit'
                        }}
                      >
                        {sig}
                      </div>
                    );
                 })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * COMPONENTE INSPETOR DE ESTILO (SIDEBAR)
 */
function StyleInspector({ 
  elementId, 
  layout, 
  onChange,
  allowOverlap,
  onToggleOverlap
}: { 
  elementId: SelectionId | null, 
  layout: Partial<FichaLayout>, 
  onChange: (updates: Partial<FichaLayout>) => void,
  allowOverlap: boolean,
  onToggleOverlap: (v: boolean) => void
}) {
  if (!elementId) return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center border-2 border-dashed rounded-xl animate-pulse">
      <div className="bg-muted p-4 rounded-full mb-4"><Layout className="h-8 w-8 opacity-20" /></div>
      <p className="text-xs font-black uppercase tracking-widest mb-1">Selecione um elemento</p>
      <p className="text-[10px]">Clique em qualquer parte da ficha ao lado para editar o estilo.</p>
    </div>
  );

  let currentStyle: FieldStyle = {};
  let label = "Configurações";

  const updateStyle = (styleUpdates: Partial<FieldStyle>) => {
    if (elementId === 'header') {
      onChange({ headerStyle: { ...layout.headerStyle, ...styleUpdates } as FieldStyle });
    } else if (elementId === 'tabela') {
      onChange({ tabelaStyle: { ...layout.tabelaStyle, ...styleUpdates } as FieldStyle });
    } else if (elementId === 'tabela-header') {
      onChange({ tabelaHeaderStyle: { ...layout.tabelaHeaderStyle, ...styleUpdates } as FieldStyle });
    } else if (elementId === 'legend') {
      onChange({ legendStyle: { ...layout.legendStyle, ...styleUpdates } as FieldStyle });
    } else if (elementId === 'sugestoes') {
      onChange({ suggestionsStyle: { ...layout.suggestionsStyle, ...styleUpdates } as FieldStyle });
    } else if (elementId === 'verso-title') {
      onChange({ versoTitleStyle: { ...layout.versoTitleStyle, ...styleUpdates } as FieldStyle });
    } else if (elementId === 'verso-period') {
      onChange({ versoPeriodStyle: { ...layout.versoPeriodStyle, ...styleUpdates } as FieldStyle });
    } else if (elementId === 'verso') {
      onChange({ versoStyle: { ...layout.versoStyle, ...styleUpdates } as FieldStyle });
    } else if (elementId.startsWith('signature-')) {
      const idx = elementId.replace('signature-', '');
      const sigStyles = { ...(layout.signatureStyles || {}) };
      sigStyles[idx] = { ...(sigStyles[idx] || layout.assinaturasStyle || {}), ...styleUpdates } as FieldStyle;
      onChange({ signatureStyles: sigStyles });
    } else if (elementId === 'logo') {
      onChange({ 
        logoStyle: { ...layout.logoStyle, ...styleUpdates } as FieldStyle,
        logoHeight: styleUpdates.height ? styleUpdates.height * 4 : layout.logoHeight, 
        logoWidth: styleUpdates.width ? styleUpdates.width * 4 : layout.logoWidth
      });
    }
  };

  if (elementId === 'header') {
    currentStyle = layout.headerStyle || {}; label = "Título Principal";
  } else if (elementId === 'tabela') {
    currentStyle = layout.tabelaStyle || {}; label = "Grade (Conteúdo)";
  } else if (elementId === 'tabela-header') {
    currentStyle = layout.tabelaHeaderStyle || {}; label = "Grade (Cabeçalho)";
  } else if (elementId === 'sugestoes') {
    currentStyle = layout.suggestionsStyle || {}; label = "Sugestões";
  } else if (elementId === 'verso-title') {
    currentStyle = layout.versoTitleStyle || {}; label = "Título do Verso";
  } else if (elementId === 'verso-period') {
    currentStyle = layout.versoPeriodStyle || {}; label = "Trimestres (Verso)";
  } else if (elementId === 'verso') {
    currentStyle = layout.versoStyle || {}; label = "Conteúdo do Verso";
  } else if (elementId.startsWith('signature-')) {
    const idx = elementId.replace('signature-', ''); label = `Assinatura ${parseInt(idx)+1}`;
    currentStyle = (layout.signatureStyles || {})[idx] || layout.assinaturasStyle || {};
  } else if (elementId.startsWith('field-')) {
    const fieldId = elementId.replace('field-', '');
    const currentFields = (layout.headerFields && layout.headerFields.length > 0) ? layout.headerFields : DEFAULT_HEADER_FIELDS;
    const field = currentFields.find(f => f.id === fieldId);
    currentStyle = field?.style || {}; label = `Campo: ${field?.label || fieldId}`;
  } else if (elementId === 'logo') {
    currentStyle = layout.logoStyle || {
      width: (layout.logoWidth || 120) / 4, 
      height: (layout.logoHeight || 48) / 4,
      x: 0,
      y: 0
    }; label = "Logo da Escola";
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="bg-primary/10 p-2 rounded-lg text-primary"><Settings2 size={16} /></div>
        <div>
          <h4 className="text-xs font-black uppercase text-primary tracking-tight">{label}</h4>
          <p className="text-[10px] text-muted-foreground">Tipografia e Estética</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {elementId !== 'logo' && (
          <div className="space-y-4">
             <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Estilo do Texto</Label>
             <div className="flex flex-wrap gap-2">
                <Button variant={currentStyle.bold ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={() => updateStyle({ bold: !currentStyle.bold })}><Bold size={16} /></Button>
                <Button variant={currentStyle.italic ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={() => updateStyle({ italic: !currentStyle.italic })}><Italic size={16} /></Button>
                <div className="h-9 w-px bg-muted mx-1" />
                <Button variant={currentStyle.alignment === 'left' ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={() => updateStyle({ alignment: 'left' })}><AlignLeft size={16} /></Button>
                <Button variant={currentStyle.alignment === 'center' ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={() => updateStyle({ alignment: 'center' })}><AlignCenter size={16} /></Button>
                <Button variant={currentStyle.alignment === 'right' ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={() => updateStyle({ alignment: 'right' })}><AlignRight size={16} /></Button>
             </div>
          </div>
        )}

        {elementId === 'logo' && (
          <div className="space-y-4 pt-4 border-t bg-primary/5 p-3 rounded-lg">
             <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">Tamanho do Logo (px)</Label>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <div className="flex justify-between text-[10px] font-bold">Largura <span className="text-primary">{layout?.logoWidth || 120}</span></div>
                   <Slider value={[layout?.logoWidth || 120]} min={40} max={300} step={5} onValueChange={([v]) => onChange({ logoWidth: v })} />
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between text-[10px] font-bold">Altura <span className="text-primary">{layout?.logoHeight || 48}</span></div>
                   <Slider value={[layout?.logoHeight || 48]} min={20} max={200} step={5} onValueChange={([v]) => onChange({ logoHeight: v })} />
                </div>
             </div>
          </div>
        )}

        {/* Cores e Fonte */}
        {elementId !== 'logo' && (
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Fonte (px)</Label>
              <Input type="number" className="h-9 text-xs" value={currentStyle.fontSize || 13} onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Cor Texto</Label>
              <Input type="color" className="p-0 h-9 w-full border-none bg-transparent" value={currentStyle.color || '#000000'} onChange={(e) => updateStyle({ color: e.target.value })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FichaLayoutManager() {
  const firestore = useFirestore();
  const layoutsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'fichas_layouts'), orderBy('nome', 'asc')) : null, [firestore]);
  const { data: layoutsData, isLoading } = useCollection<FichaLayout>(layoutsQuery);

  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [editingLayout, setEditingLayout] = useState<Partial<FichaLayout> | null>(null);
  const [activeTab, setActiveTab] = useState("geral");
  const [designerSide, setDesignerSide] = useState<'frente' | 'verso'>('frente');
  const [selectedElementId, setSelectedElementId] = useState<SelectionId | null>(null);
  const [allowOverlap, setAllowOverlap] = useState(false);

  const handleCreateNew = () => {
    const newLayout: Partial<FichaLayout> = {
      nome: "Novo Modelo",
      tipo: "TRIMESTRAL",
      colunas: STANDARD_COLUMNS,
      categorias: STANDARD_CATEGORIES,
      sugestoes: STANDARD_SUGGESTIONS,
      frontZoom: 1.2,
      backZoom: 1.3,
      hasVerso: true,
      backTitle: "Considerações",
      backLinesCount: 6,
      backLineHeight: 32,
      backPeriodsCount: 3,
      backItemSpacing: 40,
      assinaturas: ["Professor(a)", "Coordenadora", "Responsável"],
      headerFields: DEFAULT_HEADER_FIELDS
    };
    setEditingLayout(newLayout);
    setSelectedLayoutId("new");
  };

  const handleEdit = (layout: FichaLayout) => {
    setEditingLayout({ ...layout });
    setSelectedLayoutId(layout.id);
  };

  const handleSave = async () => {
    if (!firestore || !editingLayout || !editingLayout.nome) return;
    try {
      const id = selectedLayoutId === "new" ? doc(collection(firestore, 'fichas_layouts')).id : selectedLayoutId!;
      await setDoc(doc(firestore, 'fichas_layouts', id), { ...editingLayout, id, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "Modelo salvo!" });
      setSelectedLayoutId(null);
      setEditingLayout(null);
    } catch (e) {
      toast({ title: "Erro ao salvar.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Excluir modelo?")) return;
    try {
      await deleteDoc(doc(firestore, 'fichas_layouts', id));
      toast({ title: "Excluído." });
      if (selectedLayoutId === id) { setSelectedLayoutId(null); setEditingLayout(null); }
    } catch (e) {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-primary font-bold">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
        <div>
          <h3 className="text-2xl font-black text-primary flex items-center gap-2 uppercase">
             <Layout className="h-6 w-6" /> Gestão de Modelos
          </h3>
        </div>
        <div className="flex gap-2">
           <Button size="sm" onClick={handleCreateNew} className="gap-2 font-bold bg-primary uppercase text-[10px]">Novo Modelo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-3">
          {(layoutsData || []).map(layout => (
            <Card key={layout.id} className={cn("cursor-pointer transition-all hover:border-primary/50", selectedLayoutId === layout.id && "border-primary bg-primary/5")} onClick={() => handleEdit(layout)}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="overflow-hidden">
                   <p className="font-bold text-sm truncate">{layout.nome}</p>
                   <p className="text-[9px] uppercase font-black text-muted-foreground/60">{layout.tipo}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(layout.id); }}><Trash2 size={16} /></Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="md:col-span-3 space-y-6">
          {editingLayout ? (
            <Card className="border-t-4 border-t-primary shadow-xl overflow-hidden">
              <CardHeader className="bg-muted/30 py-4 px-6 flex flex-row items-center justify-between border-b">
                 <CardTitle className="text-xs font-black uppercase">Editor: {editingLayout.nome}</CardTitle>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedLayoutId(null); setEditingLayout(null); }}>Sair</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 font-bold" onClick={handleSave}>Salvar</Button>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="px-6 py-2 border-b bg-muted/10">
                    <TabsList className="bg-transparent gap-4">
                      <TabsTrigger value="geral" className="font-black text-[10px] uppercase">Geral</TabsTrigger>
                      <TabsTrigger value="conteudo" className="font-black text-[10px] uppercase">Conteúdo</TabsTrigger>
                      <TabsTrigger value="canvas" className="font-black text-[10px] uppercase flex items-center gap-2">Canvas <Eye size={12} /></TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="geral" className="p-6 space-y-4">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Nome do Modelo</Label>
                        <Input value={editingLayout.nome} onChange={(e) => setEditingLayout({ ...editingLayout, nome: e.target.value })} />
                     </div>
                     <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border">
                        <Label className="font-bold">Incluir Verso (Considerações)</Label>
                        <Switch checked={editingLayout.hasVerso ?? true} onCheckedChange={(v) => setEditingLayout({...editingLayout, hasVerso: v})} />
                     </div>
                  </TabsContent>

                  <TabsContent value="conteudo" className="p-6 space-y-8 max-h-[700px] overflow-y-auto">
                      {/* COLUNAS (TRIMESTRES) */}
                      <section className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                          <Label className="text-sm font-black uppercase text-primary">Colunas (Ex: Trimestres)</Label>
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => {
                            const cols = [...(editingLayout.colunas || [])];
                            const newId = `col-${Date.now()}`;
                            cols.push({ id: newId, nome: `Novo ${cols.length + 1}` });
                            setEditingLayout({ ...editingLayout, colunas: cols });
                          }}>+ Coluna</Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {(editingLayout.colunas || []).map((col, idx) => (
                            <div key={col.id} className="flex gap-2">
                              <Input className="h-8 text-xs font-bold" value={col.nome} onChange={(e) => {
                                const cols = [...(editingLayout.colunas || [])];
                                cols[idx].nome = e.target.value;
                                setEditingLayout({ ...editingLayout, colunas: cols });
                              }} />
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                                const cols = editingLayout.colunas?.filter(c => c.id !== col.id);
                                setEditingLayout({ ...editingLayout, colunas: cols });
                              }}><Trash2 size={14} /></Button>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* CATEGORIAS E ITENS */}
                      <section className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-2">
                          <Label className="text-sm font-black uppercase text-primary">Categorias de Avaliação</Label>
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => {
                            const cats = [...(editingLayout.categorias || [])];
                            cats.push({ titulo: "Nova Categoria", itens: ["Item 1"] });
                            setEditingLayout({ ...editingLayout, categorias: cats });
                          }}>+ Categoria</Button>
                        </div>
                        
                        <div className="space-y-8">
                          {(editingLayout.categorias || []).map((cat, cIdx) => (
                            <div key={cIdx} className="p-4 border rounded-xl bg-muted/5 space-y-4 relative">
                               <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 text-destructive" onClick={() => {
                                 const cats = editingLayout.categorias?.filter((_, i) => i !== cIdx);
                                 setEditingLayout({ ...editingLayout, categorias: cats });
                               }}><Trash2 size={14} /></Button>

                               <div className="space-y-2 max-w-[80%]">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Título da Categoria</Label>
                                  <Input className="font-bold h-8" value={cat.titulo} onChange={(e) => {
                                    const cats = [...(editingLayout.categorias || [])];
                                    cats[cIdx].titulo = e.target.value;
                                    setEditingLayout({ ...editingLayout, categorias: cats });
                                  }} />
                               </div>

                               <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Itens de Avaliação (um por linha)</Label>
                                  <Textarea 
                                    className="text-xs min-h-[100px]" 
                                    value={cat.itens.join('\n')} 
                                    onChange={(e) => {
                                      const cats = [...(editingLayout.categorias || [])];
                                      cats[cIdx].itens = e.target.value.split('\n').filter(l => l.trim() !== '');
                                      setEditingLayout({ ...editingLayout, categorias: cats });
                                    }}
                                  />
                               </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* SUGESTÕES */}
                      <section className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                           <Label className="text-sm font-black uppercase text-primary">Lista de Sugestões</Label>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase">Exibir na Frente</span>
                              <Switch checked={editingLayout.showSugestoesFrente} onCheckedChange={(v) => setEditingLayout({...editingLayout, showSugestoesFrente: v})} />
                           </div>
                        </div>
                        <Textarea 
                          className="text-xs min-h-[150px]" 
                          placeholder="Digite as sugestões padrão, uma por linha..."
                          value={(editingLayout.sugestoes || []).join('\n')}
                          onChange={(e) => setEditingLayout({ ...editingLayout, sugestoes: e.target.value.split('\n').filter(l => l.trim() !== '') })}
                        />
                      </section>

                      {/* CAMPOS DINÂMICOS DO CABEÇALHO */}
                      <section className="space-y-4">
                        <Label className="text-sm font-black uppercase text-primary border-b pb-2 block">Campos do Cabeçalho</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                           {(editingLayout.headerFields || DEFAULT_HEADER_FIELDS).map((field, fIdx) => (
                             <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                                <div className="space-y-1">
                                   <p className="text-xs font-bold">{field.label}</p>
                                   <p className="text-[9px] text-muted-foreground uppercase">{field.id}</p>
                                </div>
                                <Switch checked={field.enabled} onCheckedChange={(v) => {
                                   const fields = [...(editingLayout.headerFields || DEFAULT_HEADER_FIELDS)];
                                   const idx = fields.findIndex(f => f.id === field.id);
                                   if (idx !== -1) {
                                      fields[idx] = { ...fields[idx], enabled: v };
                                      setEditingLayout({ ...editingLayout, headerFields: fields });
                                   }
                                }} />
                             </div>
                           ))}
                        </div>
                      </section>
                  </TabsContent>

                  <TabsContent value="canvas" className="p-0">
                      {editingLayout && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[600px]">
                           <div className="lg:col-span-1 border-r p-6 bg-muted/5">
                              <StyleInspector elementId={selectedElementId} layout={editingLayout} onChange={(updates) => setEditingLayout({ ...editingLayout, ...updates })} allowOverlap={allowOverlap} onToggleOverlap={setAllowOverlap} />
                           </div>
                           <div className="lg:col-span-3 bg-muted/10 p-10 flex flex-col items-center gap-8 overflow-y-auto max-h-[800px]">
                               <div className="flex gap-4 p-1 bg-white border rounded-lg shadow-sm items-center flex-wrap">
                                 <Button size="sm" variant={designerSide === "frente" ? "default" : "ghost"} className="font-bold text-[10px] uppercase" onClick={() => setDesignerSide("frente")}>Frente</Button>
                                 <Button size="sm" variant={designerSide === "verso" ? "default" : "ghost"} className="font-bold text-[10px] uppercase" onClick={() => setDesignerSide("verso")} disabled={!editingLayout.hasVerso}>Verso</Button>
                                 <div className="h-6 w-px bg-muted mx-1" />
                                 <Button size="sm" variant="outline" className="font-bold text-[10px] uppercase text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => {
                                   if (!window.confirm("Resetar posicoes para o padrao?")) return;
                                   setEditingLayout(prev => !prev ? prev : ({
                                     ...prev,
                                     logoStyle: { x: 0, y: 2, width: 30, height: 12 },
                                     headerStyle: { x: 38, y: 2, width: 150, height: 12, fontSize: 20, bold: true, alignment: "center" },
                                     legendStyle: { x: 0, y: 96, width: 190, height: 8, fontSize: 10 },
                                     tabelaStyle: { x: 0, y: 108, width: 190, fontSize: 9 },
                                     suggestionsStyle: { x: 0, y: 220, width: 190, fontSize: 10 },
                                     headerFields: DEFAULT_HEADER_FIELDS,
                                     signatureStyles: {},
                                     assinaturasMargemTop: 262,
                                     versoTitleStyle: { x: 5, y: 5, width: 190, height: 15, fontSize: 18, bold: true, alignment: "center" },
                                     versoStyle: { x: 5, y: 25, width: 190 },
                                   }));
                                 }}>
                                   <RefreshCw size={10} className="mr-1" /> Resetar Layout
                                 </Button>
                               </div>
                               <MiniFichaPreview layout={editingLayout} side={designerSide} selectedId={selectedElementId} onSelect={setSelectedElementId} />
                           </div>
                        </div>
                      )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-3xl opacity-30 uppercase font-black tracking-widest">
              Selecione um Modelo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
