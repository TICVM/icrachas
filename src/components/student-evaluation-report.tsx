"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFirestore, useMemoFirebase, useCollection, useDoc, useUser } from "@/firebase";
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, orderBy } from "firebase/firestore";
import { Student, EvaluationReport, EvaluationScore, SchoolClass, SchoolSegment, SystemConfig, FichaLayout, HeaderField, FieldStyle } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";

// Fallback categories if no layout is found
const DEFAULT_CATEGORIES = [
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

const DEFAULT_SUGGESTIONS = [
  "Melhorar a postura em sala de aula",
  "Melhorar a organização",
  "Fazer as lições/trabalhos propostos",
  "Cumprir prazos estabelecidos pelos professores",
  "Ter mais empenho",
  "Conversar menos",
  "Melhorar ortografia"
];

const DEFAULT_COLUMNS = [
  { id: "t1", nome: "1º Trimestre" },
  { id: "t2", nome: "2º Trimestre" },
  { id: "t3", nome: "3º Trimestre" }
];

const DEFAULT_HEADER_FIELDS: HeaderField[] = [
  { id: 'nome', label: 'Nome do Aluno(a)', enabled: true, colSpan: 3, style: { bold: true, italic: false, alignment: 'left', fontSize: 13, color: '#000000', x: 0, y: 0, width: 140 } },
  { id: 'matricula', label: 'Matrícula', enabled: true, colSpan: 1, style: { bold: false, italic: false, alignment: 'left', fontSize: 12, color: '#000000', x: 145, y: 0, width: 45 } },
  { id: 'numeroChamada', label: 'Nº Chamada', enabled: false, colSpan: 1, style: { bold: false, italic: false, alignment: 'left', fontSize: 12, color: '#000000', x: 0, y: 8, width: 30 } },
  { id: 'turma', label: 'Turma', enabled: true, colSpan: 2, style: { bold: false, italic: false, alignment: 'left', fontSize: 12, color: '#000000', x: 35, y: 8, width: 60 } },
  { id: 'professor', label: 'Professor(a)', enabled: true, colSpan: 2, style: { bold: false, italic: false, alignment: 'left', fontSize: 12, color: '#000000', x: 100, y: 8, width: 90 } }
];

function ScoreDot({ score }: { score: EvaluationScore }) {
  if (score === "NONE") return null;

  return (
    <div
      className={cn(
        "w-6 h-6 rounded-full mx-auto border-2 border-black transition-transform pointer-events-none flex overflow-hidden",
      )}
    >
      {score === "MEDIUM" ? (
        <div className="flex w-full h-full">
          <div className="w-1/2 h-full bg-[#8c3127]" />
          <div className="w-1/2 h-full bg-[#04a74c]" />
        </div>
      ) : (
        <div 
          className="w-full h-full" 
          style={{ backgroundColor: score === "HIGH" ? "#04a74c" : "#8c3127" }} 
        />
      )}
    </div>
  );
}

function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <div
      className="w-full h-full min-h-[28px] mx-auto flex items-center justify-center pointer-events-none"
    >
      {checked ? <span className="font-bold text-lg leading-none select-none text-black">X</span> : null}
    </div>
  );
}

const getNextScore = (current: EvaluationScore): EvaluationScore => {
  switch (current) {
    case "NONE": return "HIGH";
    case "HIGH": return "MEDIUM";
    case "MEDIUM": return "LOW";
    case "LOW": return "NONE";
  }
};

function LinedTextArea({ value, onChange, fieldId, title, linesCount = 6, lineHeight = 32, maxChars }: { value: string, onChange: (v: string) => void, fieldId?: string, title?: string, linesCount?: number, lineHeight?: number, maxChars?: number }) {
  // Cálculo da altura exata baseada na quantidade de linhas e altura de cada linha
  const calculatedHeight = (linesCount * lineHeight);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const lines = newValue.split('\n');
    
    // Se houver limite de caracteres, não deixa passar
    if (maxChars && newValue.length > maxChars) {
      return;
    }
    
    // Se o número de linhas manuais (quebras de linha) for maior que o permitido, bloqueia
    if (lines.length > linesCount) {
      return;
    }
    
    onChange(newValue);
  };

  return (
    <div className="w-full space-y-4 flex flex-col items-center">
      {title && <h3 className="text-xl font-bold text-center uppercase tracking-wider">{title}</h3>}
      <div 
        className="border border-black/30 p-1 bg-white relative mx-auto" 
        style={{ 
          width: "760px", 
          maxWidth: "100%", 
          boxSizing: "border-box"
        }}
      >
        <textarea
          id={fieldId}
          name={fieldId}
          value={value}
          onChange={handleChange}
          className="w-full resize-none border-none outline-none text-[16px] font-medium bg-transparent print:bg-white print:placeholder:text-transparent"
          style={{
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            backgroundImage: `repeating-linear-gradient(transparent, transparent ${lineHeight - 1}px, #000 ${lineHeight - 1}px, #000 ${lineHeight}px)`,
            backgroundPosition: "0 0px",
            backgroundSize: `100% ${lineHeight}px`,
            backgroundAttachment: "local",
            lineHeight: `${lineHeight}px`,
            height: `${calculatedHeight}px`,
            maxHeight: `${calculatedHeight}px`,
            overflow: "hidden",
            paddingTop: "0px",
            letterSpacing: "normal",
            wordSpacing: "normal",
            fontFeatureSettings: '"kern" 1',
            WebkitFontSmoothing: "antialiased"
          }}
          placeholder="Clique aqui para digitar o relatório..."
          spellCheck={false}
          autoComplete="off"
        />
        {maxChars && (
          <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/60 font-mono bg-white/80 px-1 rounded print:hidden pointer-events-none">
            {value.length} / {maxChars}
          </div>
        )}
      </div>
    </div>
  );
}

export interface StudentEvaluationReportRef {
  save: (options?: { silent?: boolean }) => Promise<void>;
  reset: (options?: { silent?: boolean }) => Promise<void>;
  bulkFill: (score: EvaluationScore) => void;
}

const StudentEvaluationReport = React.forwardRef<StudentEvaluationReportRef, { student: Student; selectedYear: string; selectedTrimester?: string; hideControls?: boolean; allowScaling?: boolean }>(
  ({ student, selectedYear, selectedTrimester = "t1", hideControls, allowScaling }, ref) => {
    const firestore = useFirestore();
    const { user } = useUser();

    const reportDocRef = useMemoFirebase(() => {
      if (!firestore || !student?.id || !user) return null;
      return doc(firestore, 'fichas_avaliacao', `${student.id}_${selectedYear}`);
    }, [firestore, student, selectedYear, user]);

    const [teacherName, setTeacherName] = useState("");
    const [scores, setScores] = useState<Record<string, Record<string, Record<string, EvaluationScore>>>>({});
    const [suggestions, setSuggestions] = useState<Record<string, Record<string, boolean>>>({});
    const [considerations, setConsiderations] = useState<Record<string, string>>({ t1: "", t2: "", t3: "" });
    const [viewSide, setViewSide] = useState<'frente' | 'verso'>('frente');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const lastLocalUpdateRef = React.useRef(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scaleFactor, setScaleFactor] = useState(1);

    useEffect(() => {
      const canScale = !hideControls || allowScaling;
      if (typeof window === "undefined" || !canScale) return;

      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      const updateScale = () => {
        const parentWidth = parent.clientWidth;
        const baseWidth = 850;
        
        if (parentWidth < baseWidth && parentWidth > 0) {
          const newScale = (parentWidth - 32) / baseWidth;
          setScaleFactor(Math.max(0.3, newScale));
        } else {
          setScaleFactor(1);
        }
      };

      // Chamada inicial com pequeno delay para garantir renderização do pai
      const timer = setTimeout(updateScale, 100);

      const resizeObserver = new ResizeObserver(() => {
        updateScale();
      });

      resizeObserver.observe(parent);

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
      };
    }, [hideControls, allowScaling, isLoaded]);

    // Fetch classes and segments for layout and teacher auto-fill
    const segmentsQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'segmentos'), orderBy('ordem', 'asc')) : null, [firestore, user]);
    const turmasQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'turmas'), orderBy('ordem', 'asc')) : null, [firestore, user]);
    const layoutsQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'fichas_layouts'), orderBy('nome', 'asc')) : null, [firestore, user]);

    const { data: segmentsData } = useCollection<SchoolSegment>(segmentsQuery);
    const { data: turmasData } = useCollection<SchoolClass>(turmasQuery);
    const { data: layoutsData } = useCollection<FichaLayout>(layoutsQuery);

    // Fetch school logo and system settings
    const configRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'configuracoes', 'geral') : null, [firestore, user]);
    const { data: systemConfig } = useDoc<SystemConfig>(configRef);

    const logoUrl = systemConfig?.logoFichaUrl || systemConfig?.logoUrl || "/logo-colegio.jpg";
    const logoHeight = systemConfig?.logoFichaHeight || systemConfig?.logoHeight || 48;

    // Resolve which layout to use
    const resolvedLayout = useMemo(() => {
      if (!student || !segmentsData || !turmasData || !layoutsData) return null;

      const segment = segmentsData.find(s => s.nome === student.segmento);
      const studentClass = turmasData.find(c => c.nome === student.turma && c.segmentoId === segment?.id);

      const layoutId = studentClass?.fichaLayoutId || segment?.fichaLayoutId || systemConfig?.defaultFichaLayoutId;
      return (layoutsData || []).find(l => l.id === layoutId) || null;
    }, [student, segmentsData, turmasData, layoutsData, systemConfig]);

    const categories = resolvedLayout?.categorias || DEFAULT_CATEGORIES;
    const columns = resolvedLayout?.colunas || DEFAULT_COLUMNS;
    const suggestionList = resolvedLayout?.sugestoes || DEFAULT_SUGGESTIONS;

    // Resolve a coluna ativa com base no seletor ou no config global
    const activeColumn = useMemo(() => {
      return columns.find(c => c.id === selectedTrimester) || columns.find(c => c.id === systemConfig?.activeTrimesterId) || columns[0];
    }, [columns, selectedTrimester, systemConfig]);

    const handleAutoSave = async () => {
      if (!reportDocRef || !isLoaded) return;
      setIsSaving(true);
      try {
        const dataToSave: Partial<EvaluationReport> = {
          studentId: student.id,
          studentName: student.nome,
          studentClass: student.turma,
          year: selectedYear,
          teacherName,
          scores,
          suggestions,
          considerations,
          updatedAt: serverTimestamp()
        };
        await setDoc(reportDocRef, dataToSave, { merge: true });
      } catch (e) {
        toast({ title: "Erro ao salvar", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    };

    const handleResetFicha = async () => {
      if (!confirm("Tem certeza que deseja limpar todos os campos desta ficha?")) return;
      lastLocalUpdateRef.current = Date.now();
      setTeacherName("");
      setScores({});
      setSuggestions({});
      setConsiderations({ t1: "", t2: "", t3: "" });
      if (reportDocRef) {
        await setDoc(reportDocRef, {
          scores: {},
          suggestions: {},
          considerations: { t1: "", t2: "", t3: "" },
          teacherName: "",
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      toast({ title: "Ficha limpa com sucesso!" });
    };

    const handleBulkFill = (score: EvaluationScore) => {
      lastLocalUpdateRef.current = Date.now();
      const newScores: any = {};

      categories.forEach(cat => {
        newScores[cat.titulo] = {};
        cat.itens.forEach(item => {
          newScores[cat.titulo][item] = {};
          columns.forEach(col => {
            newScores[cat.titulo][item][col.id] = score;
          });
        });
      });

      setScores(newScores);
    };

    // Expose methods to parent
    React.useImperativeHandle(ref, () => ({
      save: async (options?: { silent?: boolean }) => {
        await handleAutoSave();
        if (!options?.silent) {
          toast({ title: "Ficha salva com sucesso!" });
        }
      },
      reset: async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
          if (!confirm("Tem certeza que deseja limpar todos os campos desta ficha?")) return;
        }
        lastLocalUpdateRef.current = Date.now();
        setTeacherName("");
        setScores({});
        setSuggestions({});
        setConsiderations({ t1: "", t2: "", t3: "" });
        if (reportDocRef) {
          const { setDoc: _setDoc, serverTimestamp: _serverTimestamp } = await import("firebase/firestore");
          await _setDoc(reportDocRef, {
            scores: {},
            suggestions: {},
            considerations: { t1: "", t2: "", t3: "" },
            teacherName: "",
            updatedAt: _serverTimestamp()
          }, { merge: true });
        }
        if (!options?.silent) {
          toast({ title: "Ficha limpa com sucesso!" });
        }
      },
      bulkFill: (score: EvaluationScore) => {
        handleBulkFill(score);
      }
    }));

    useEffect(() => {
      if (!reportDocRef) {
        setIsLoaded(true);
        return;
      }

      if (hideControls) {
        // Modo impressão/lote: faz leitura única (sem listener em tempo real)
        setIsLoaded(false);
        import("firebase/firestore").then(({ getDoc }) => {
          getDoc(reportDocRef).then((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as EvaluationReport;
              setTeacherName(data.teacherName || "");
              setScores(data.scores || {});
              setSuggestions(data.suggestions || {});
              setConsiderations(data.considerations || { t1: "", t2: "", t3: "" });
            }
            setIsLoaded(true);
          }).catch(() => setIsLoaded(true));
        });
        return;
      }

      // Modo normal: listener em tempo real
      setIsLoaded(false);
      const unsub = onSnapshot(reportDocRef, (docSnap) => {
        const now = Date.now();
        if (now - lastLocalUpdateRef.current > 5000) {
          if (docSnap.exists()) {
            const data = docSnap.data() as EvaluationReport;
            setTeacherName(data.teacherName || "");
            setScores(data.scores || {});
            setSuggestions(data.suggestions || {});
            setConsiderations(data.considerations || { t1: "", t2: "", t3: "" });
          } else {
            setTeacherName("");
            setScores({});
            setSuggestions({});
            setConsiderations({ t1: "", t2: "", t3: "" });
          }
        }
        setIsLoaded(true);
      });
      return () => unsub();
    }, [reportDocRef]);

    // Auto-fill teacher names if empty
    useEffect(() => {
      if (!isLoaded || teacherName || !student || !turmasData || !segmentsData) return;

      const segment = segmentsData.find(s => s.nome === student.segmento);
      if (!segment) return;

      const studentClass = turmasData.find(c =>
        c.nome === student.turma && c.segmentoId === segment.id
      );

      if (studentClass && studentClass.professores && studentClass.professores.length > 0) {
        const joinedTeachers = studentClass.professores.join("/");
        setTeacherName(joinedTeachers);

        if (reportDocRef) {
          setDoc(reportDocRef, { teacherName: joinedTeachers }, { merge: true });
        }
      }
    }, [isLoaded, student, turmasData, segmentsData, teacherName, reportDocRef]);

    const handleScoreChange = (category: string, item: string, columnId: string) => {
      lastLocalUpdateRef.current = Date.now();
      setScores(prev => {
        const catData = prev[category] || {};
        const itemData = catData[item] || {};
        const currentVal = itemData[columnId] || "NONE";
        const nextVal = getNextScore(currentVal);

        return {
          ...prev,
          [category]: {
            ...catData,
            [item]: {
              ...itemData,
              [columnId]: nextVal
            }
          }
        };
      });
    };

    const handleSuggestionChange = (item: string, columnId: string) => {
      lastLocalUpdateRef.current = Date.now();
      setSuggestions(prev => {
        const itemData = prev[item] || {};
        return {
          ...prev,
          [item]: {
            ...itemData,
            [columnId]: !itemData[columnId]
          }
        };
      });
    };

    // Debounced save
    useEffect(() => {
      if (!isLoaded || hideControls) return;
      const t = setTimeout(() => {
        handleAutoSave();
      }, 2000);
      return () => clearTimeout(t);
    }, [scores, suggestions, considerations, teacherName]);

    const getFieldValue = (fieldId: string) => {
      switch (fieldId) {
        case 'nome': return student.nome;
        case 'matricula': return student.matricula;
        case 'numeroChamada': return student.numeroChamada || "";
        case 'turma': return student.turma || selectedYear;
        case 'segmento': return student.segmento;
        case 'professor': return teacherName;
        default: return student.customData?.[fieldId] || "";
      }
    };

    if (!isLoaded) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const isDisciplinar = resolvedLayout?.tipo === 'DISCIPLINAR';
    const isInfantil = resolvedLayout?.tipo === 'INFANTIL';
    const currentColumn = activeColumn;

    return (
      <div className={cn("w-full transition-all duration-300", !hideControls && "flex flex-col items-center gap-6")}>
        {!hideControls && (
          <div className="flex bg-muted/30 p-1 rounded-xl border border-primary/10 gap-1 mt-4 print:hidden">
            <Button 
              variant={viewSide === 'frente' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-lg h-9 w-32 font-bold transition-all"
              onClick={() => setViewSide('frente')}
            >
              Frente
            </Button>
            <Button 
              variant={viewSide === 'verso' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-lg h-9 w-32 font-bold transition-all"
              onClick={() => setViewSide('verso')}
            >
              Verso
            </Button>
          </div>
        )}

        <div
          ref={containerRef}
          className={cn(
            "bg-white text-black p-4 md:p-8 mx-auto border shadow-2xl relative font-serif",
            "print:shadow-none print:border-none print:p-0 print:m-0 print:mx-auto",
            hideControls
              ? "max-w-none w-full border-none shadow-none p-0 mb-0 break-after-page"
              : "max-w-[850px] mb-10 min-h-[1120px] flex flex-col"
          )}
          style={{
            transformOrigin: "top center",
            transform: (allowScaling || !hideControls) && scaleFactor < 1 ? `scale(${scaleFactor})` : "none",
            marginBottom: (allowScaling || !hideControls) && scaleFactor < 1 ? `-${(1 - scaleFactor) * 100}%` : undefined
          }}
          id="ficha-print-area"
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0; padding: 0; }
              #ficha-print-area { 
                width: 210mm !important; 
                height: 297mm !important; 
                margin: 0 !important;
                padding: 10mm !important;
                transform: scale(0.93) !important;
                transform-origin: top center !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                overflow: hidden !important;
              }
              .print-no-break { break-inside: avoid; page-break-inside: avoid; }
              .split-container-print { display: flex !important; gap: 4mm !important; width: 100% !important; align-items: stretch !important; }
              .split-item-left { flex: 1 !important; }
              .split-item-right { width: 30% !important; min-width: 55mm !important; }
            }
          ` }} />
          {/* ----- LADO FRENTE (INFANTIL OU PADRÃO) ----- */}
          <div className={cn(
            "w-full flex-1 flex flex-col split-container-print",
            !hideControls && viewSide !== 'frente' && "hidden"
          )}>
            {/* ----- CABEÇALHO LÓGICO (FLEX/GRID) ----- */}
            <div className="flex justify-between items-start mb-6 print:mb-2 print:pt-[5mm]">
              <div 
                className="flex items-center justify-center overflow-hidden"
                style={{ 
                  height: (hideControls ? Math.min(resolvedLayout?.logoHeight || logoHeight, 45) : (resolvedLayout?.logoHeight || logoHeight) + 10) + 'px',
                  width: (resolvedLayout?.logoWidth ? `${resolvedLayout.logoWidth}px` : 'auto')
                }}
              >
                <img src={logoUrl} alt="Logo Colégio" className="object-contain w-full h-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div className="flex-1 px-4 text-right">
                <h1 
                  className="text-3xl font-bold text-[#2e3d4d] uppercase tracking-tight"
                  style={{ 
                    fontSize: `${resolvedLayout?.headerStyle?.fontSize || resolvedLayout?.cabecalhoFontSize || 28}px`,
                    fontWeight: resolvedLayout?.headerStyle?.bold ? 'bold' : 'normal',
                    fontStyle: resolvedLayout?.headerStyle?.italic ? 'italic' : 'normal',
                    color: resolvedLayout?.headerStyle?.color || '#2e3d4d',
                    textAlign: resolvedLayout?.headerStyle?.alignment || 'right'
                  }}
                >
                  Ficha Individual
                </h1>
              </div>
            </div>

            {/* ----- INFO BOX (GRADE DE DADOS) ----- */}
            <div className="w-full border-2 border-black mb-6 font-sans text-sm">
              <div className="flex border-b-2 border-black">
                <div className="flex-1 p-1 border-r-2 border-black px-2 flex items-center gap-2">
                  <span className="font-bold text-[#2e3d4d] whitespace-nowrap">Nome do Aluno(a):</span>
                  <span className="font-semibold text-lg">{student.nome}</span>
                </div>
                <div className="w-[180px] p-1 px-2 flex items-center gap-2">
                  <span className="font-bold text-[#2e3d4d]">Ano:</span>
                  <span className="font-semibold">{student.turma || selectedYear}</span>
                </div>
              </div>
              <div className="flex p-1 px-2 items-center gap-2">
                <span className="font-bold text-[#2e3d4d] whitespace-nowrap">Professoras:</span>
                <Input
                  id={`professor-${student.id}`}
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="inline-block h-8 border-none shadow-none text-black bg-transparent p-0 placeholder:text-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none w-full font-semibold"
                  style={{ fontSize: 'inherit' }}
                  placeholder="..."
                />
              </div>
            </div>

            {/* ----- LEGENDA (ESTÁTICA) ----- */}
            <div className="flex justify-start items-center gap-12 mb-4 px-2 text-sm font-bold border-2 border-black p-2">
              <span className="text-[#2e3d4d]">Legenda:</span>
              <div className="flex gap-10 items-center grow justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-5 border-2 border-black" style={{ backgroundColor: "#8c3127" }} />
                  <span className="text-muted-foreground uppercase text-xs">Baixo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-5 border-2 border-black flex overflow-hidden">
                    <div className="w-1/2 h-full bg-[#8c3127]" />
                    <div className="w-1/2 h-full bg-[#04a74c]" />
                  </div>
                  <span className="text-muted-foreground uppercase text-xs">Médio</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-5 border-2 border-black" style={{ backgroundColor: "#04a74c" }} />
                  <span className="text-muted-foreground uppercase text-xs">Alto</span>
                </div>
              </div>
            </div>

            {isInfantil ? (
              <div className="space-y-8 flex-1">
                <LinedTextArea
                  title={`${resolvedLayout?.backTitle || "Relatório"} - ${currentColumn.nome}`}
                  fieldId={`relatorio-${student.id}-${currentColumn.id}`}
                  value={considerations[currentColumn.id as keyof typeof considerations] || ""}
                  linesCount={resolvedLayout?.backLinesCount || 12}
                  lineHeight={resolvedLayout?.backLineHeight || 32}
                  maxChars={resolvedLayout?.backMaxChars}
                  onChange={(val) => {
                    lastLocalUpdateRef.current = Date.now();
                    setConsiderations(prev => ({ ...prev, [currentColumn.id]: val }));
                  }}
                />

                 <div className="flex flex-col items-center gap-6 pt-12 flex-shrink-0">
                    <div className="grid grid-cols-3 gap-8 w-full px-4 uppercase transition-all">
                       {(resolvedLayout?.assinaturas || ["Assinatura da Professora", "Assinatura da Coordenadora", "Assinatura do Responsável"]).map((sig, sIdx) => {
                         const style = resolvedLayout?.signatureStyles?.[sIdx] || resolvedLayout?.assinaturasStyle || {};
                         return (
                          <div key={sIdx} className="flex flex-col items-center gap-1"
                            style={{
                              fontSize: style.fontSize ? `${style.fontSize}px` : "12px",
                              fontWeight: style.bold !== false ? 'bold' : 'normal',
                              fontStyle: style.italic ? 'italic' : 'normal',
                              color: style.color || 'inherit',
                              textAlign: style.alignment || 'center'
                            }}
                          >
                            <div className="w-full border-t-2 border-black" style={{ borderColor: style.color || 'black' }} />
                            {sig}
                          </div>
                         );
                       })}
                    </div>
                   <p className="font-serif italic text-sm mt-4 tracking-wider">Rendimento - {currentColumn.nome}</p>
                   {/* Infantil Table Logic */}
                   <div className="w-full overflow-hidden border-2 border-black font-sans text-[10px]">
                      <div className="grid grid-cols-3 divide-x-2 divide-black">
                         {categories[0].itens.map((item) => (
                           <div key={item} className="flex flex-col">
                              <div className="bg-white border-b-2 border-black py-1 px-4 font-bold text-center uppercase tracking-widest">{item}</div>
                              <div className="grid grid-cols-4 divide-x divide-black/30 h-10">
                                 {(['NONE', 'LOW', 'MEDIUM', 'HIGH'] as EvaluationScore[]).map((score) => (
                                    <div key={score} className="flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors"
                                      onClick={() => handleScoreChange(categories[0].titulo, item, currentColumn.id)}
                                    >
                                       <span className="italic font-serif text-[9px] mb-1">
                                          {score === 'NONE' ? (resolvedLayout?.infantilConceitos?.[0] || 'I') : 
                                           score === 'LOW' ? (resolvedLayout?.infantilConceitos?.[1] || 'PM') : 
                                           score === 'MEDIUM' ? (resolvedLayout?.infantilConceitos?.[2] || 'B') : 
                                           (resolvedLayout?.infantilConceitos?.[3] || 'MB')}
                                       </span>
                                       <div className={cn("w-3 h-3 rounded-full border border-black", scores[categories[0].titulo]?.[item]?.[currentColumn.id] === score && "bg-black")} />
                                    </div>
                                 ))}
                              </div>
                           </div>
                         ))}
                      </div>
                      <div className="bg-white border-t-2 border-black p-1 text-[8px] flex items-center justify-center text-center font-bold">
                        {resolvedLayout?.infantilLegenda || (
                          <div className="flex justify-between w-full px-4">
                            <span>Nota 0 a 3,9: I (Insuficiente)</span>
                            <span>|</span>
                            <span>Nota 4,0 a 5,9: PM (Precisa Melhorar)</span>
                            <span>|</span>
                            <span>Nota 6,0 a 7,9: B (Bom)</span>
                            <span>|</span>
                            <span>Nota 8,0 a 10: MB (Muito Bom)</span>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 items-start w-full transition-all">
                {/* BLOCADO ESQUERDO: RÓTULOS */}
                <div className="flex-1 split-item-left">
                  <table className="w-full border-collapse border-2 border-black text-[13px] font-sans print:text-[11px]">
                    <thead>
                      <tr className="h-8">
                        <th className="border-2 border-black py-1 px-2 text-center bg-[#e9eff7] uppercase font-black text-[11px]">
                          Categoria de avaliação
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <React.Fragment key={cat.titulo}>
                          <tr className="bg-[#e9eff7] h-8">
                            <td className="border-2 border-black px-2 py-1 font-black uppercase text-[11px] print:py-0.5">{cat.titulo}</td>
                          </tr>
                          {cat.itens.map((item) => (
                            <tr key={item} className="h-8">
                              <td className="border-2 border-black px-2 py-0.5 font-medium leading-[1.2] print:py-0 print:px-1.5">{item}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}

                      {/* SEÇÃO 4 - SUGESTÕES */}
                      {resolvedLayout?.showSugestoesFrente !== false && (
                        <React.Fragment>
                          <tr className="bg-[#e9eff7] h-8">
                            <td className="border-2 border-black px-2 py-1 font-black uppercase text-[11px] print:py-0.5">
                              4 - Sugestões do(a) professor(a) ao aluno(a)
                            </td>
                          </tr>
                          {suggestionList.map((sugg) => (
                            <tr key={sugg} className="h-8">
                              <td className="border-2 border-black px-2 py-0.5 font-medium leading-[1.2] print:py-0 print:px-1.5">{sugg}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BLOCADO DIREITO: NOTAS / TRIMESTRES */}
                <div className="w-[30%] min-w-[200px] split-item-right">
                  <table className="w-full border-collapse border-2 border-black text-[13px] font-sans print:text-[11px]">
                    <thead>
                      <tr className="h-8">
                        {columns.map(col => (
                          <th key={col.id} className="border-2 border-black py-1 text-center font-bold bg-[#e9eff7] px-1 uppercase text-[11px]">
                            {col.nome}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <React.Fragment key={cat.titulo}>
                          <tr className="bg-[#e9eff7] h-8">
                            {columns.map(col => (
                              <td key={col.id} className="border-2 border-black"></td>
                            ))}
                          </tr>
                          {cat.itens.map((item) => (
                            <tr key={item} className="h-8">
                              {columns.map(col => (
                                <td 
                                  key={col.id} 
                                  className="border-2 border-black p-0.5 text-center align-middle cursor-pointer select-none" 
                                  onClick={() => handleScoreChange(cat.titulo, item, col.id)}
                                >
                                  <ScoreDot score={scores[cat.titulo]?.[item]?.[col.id] || 'NONE'} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}

                      {/* SEÇÃO 4 - NOTAS DAS SUGESTÕES */}
                      {resolvedLayout?.showSugestoesFrente !== false && (
                        <React.Fragment>
                          <tr className="bg-[#e9eff7] h-8">
                            {columns.map(col => (
                              <td key={col.id} className="border-2 border-black"></td>
                            ))}
                          </tr>
                          {suggestionList.map((sugg) => (
                            <tr key={sugg} className="h-8">
                              {columns.map(col => (
                                <td 
                                  key={col.id} 
                                  className="border-2 border-black p-0 text-center align-middle cursor-pointer select-none" 
                                  onClick={() => handleSuggestionChange(sugg, col.id)}
                                >
                                  {suggestions[sugg]?.[col.id] && (
                                    <span className="font-bold text-lg leading-none select-none">X</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ----- LADO VERSO (CONSIDERAÇÕES) ----- */}
          {(resolvedLayout?.hasVerso ?? true) && (
            <div className={cn(
              "w-full bg-white font-sans flex flex-col items-center print:flex",
              !hideControls && viewSide !== 'verso' && "hidden"
            )}>
              <div 
                className="font-bold text-center uppercase tracking-wider transition-all p-2 mb-4 mt-2"
                style={{ 
                  fontSize: '20px',
                  color: '#2e3d4d'
                }}
              >
                Considerações
              </div>
              
              <div className="flex flex-col items-center w-full px-[5mm] gap-2">
                {(["t1", "t2", "t3"] as const).slice(0, resolvedLayout?.backPeriodsCount || 3).map((trimestre, idx) => (
                  <div 
                    key={trimestre} 
                    className="w-full flex flex-col items-center print-no-break"
                  >
                    <h3 
                      className="text-[14px] font-bold text-center mb-1 uppercase" 
                      style={{ color: '#2e3d4d' }}
                    >
                      Considerações do {idx + 1}º Trimestre
                    </h3>

                    <LinedTextArea
                      fieldId={`consideracoes-${student.id}-${trimestre}`}
                      value={considerations[trimestre] || ""}
                      linesCount={resolvedLayout?.backLinesCount || 7}
                      lineHeight={resolvedLayout?.backLineHeight || 28}
                      maxChars={resolvedLayout?.backMaxChars}
                      onChange={(val) => {
                        lastLocalUpdateRef.current = Date.now();
                        setConsiderations(prev => ({ ...prev, [trimestre]: val }));
                      }}
                    />

                    {/* Assinaturas após cada período */}
                    <div className="flex justify-between items-center w-full px-4 mt-4 mb-6">
                       <div className="flex flex-col items-center w-[30%]">
                          <div className="w-full border-t border-black mb-1"></div>
                          <span className="text-[9px] uppercase font-bold text-[#2e3d4d]">Professor(a)</span>
                       </div>
                       <div className="flex flex-col items-center w-[30%]">
                          <div className="w-full border-t border-black mb-1"></div>
                          <span className="text-[9px] uppercase font-bold text-[#2e3d4d]">Coordenadora</span>
                       </div>
                       <div className="flex flex-col items-center w-[30%]">
                          <div className="w-full border-t border-black mb-1"></div>
                          <span className="text-[9px] uppercase font-bold text-[#2e3d4d]">Responsável</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isSaving && <div className="fixed bottom-4 right-4 bg-black/80 font-bold text-white px-4 py-2 rounded-full text-xs print:hidden animate-pulse">Auto-salvando...</div>}
      </div>
    );
  }
);

StudentEvaluationReport.displayName = "StudentEvaluationReport";

export default StudentEvaluationReport;
