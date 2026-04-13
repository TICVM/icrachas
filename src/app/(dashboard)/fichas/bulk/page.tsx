"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Student } from "@/lib/types";
import StudentEvaluationReport from "@/components/student-evaluation-report";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Loader2, BookOpen, Save, Eraser, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, List } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type StudentEvaluationReportRef } from "@/components/student-evaluation-report";
import { type EvaluationScore } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LIMITE_OPCOES = [15, 30, 60, -1]; // -1 = Todas

function BulkFichasContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedYear = searchParams.get("year") || new Date().getFullYear().toString();

  const [isRendered, setIsRendered] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [limite, setLimite] = useState(15);
  const [pagina, setPagina] = useState(0);
  const reportRefs = React.useRef<Record<string, StudentEvaluationReportRef | null>>({});

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'alunos'), orderBy('nome', 'asc'));
  }, [firestore, user]);

  const { data: allStudents, isLoading } = useCollection<Student>(studentsQuery);
  const students = (allStudents || []).filter(s => s.enabled === true);

  // Paginação
  const totalPaginas = limite === -1 ? 1 : Math.ceil(students.length / limite);
  const studentsPagina = useMemo(() => {
    if (limite === -1) return students;
    const inicio = pagina * limite;
    return students.slice(inicio, inicio + limite);
  }, [students, limite, pagina]);

  // Quando muda limite, página, ou a quantidade de alunos carregados, reinicia o render
  // IMPORTANTE: usar dependências PRIMITIVAS (não o array) para evitar que o Firebase
  // cancele o timeout a cada re-render com nova referência de array.
  useEffect(() => {
    if (isLoading) return; // ainda carregando do Firebase, aguarda
    setIsRendered(false);
    reportRefs.current = {};
    const count = limite === -1 ? students.length : Math.min(limite, Math.max(0, students.length - pagina * limite));
    if (count > 0) {
      const t = setTimeout(() => setIsRendered(true), 1200);
      return () => clearTimeout(t);
    }
  }, [isLoading, students.length, limite, pagina]);

  const handleChangeLimite = (novoLimite: number) => {
    setLimite(novoLimite);
    setPagina(0);
  };

  const handleGlobalBulkFill = (score: EvaluationScore) => {
    Object.values(reportRefs.current).forEach(ref => {
      if (ref) ref.bulkFill(score);
    });
  };

  const handleSaveAll = async () => {
    const refs = Object.values(reportRefs.current).filter(Boolean);
    if (refs.length === 0) return;
    setIsSavingAll(true);
    try {
      await Promise.all(refs.map(ref => ref!.save({ silent: true })));
      toast({ title: `✅ ${refs.length} fichas salvas com sucesso!` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Algumas fichas podem não ter sido salvas." });
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleClearAll = async () => {
    const refs = Object.values(reportRefs.current).filter(Boolean);
    if (refs.length === 0) return;
    if (!confirm(`Tem certeza que deseja LIMPAR todas as ${refs.length} fichas visíveis? Esta ação não pode ser desfeita.`)) return;
    setIsClearingAll(true);
    try {
      await Promise.all(refs.map(ref => ref!.reset({ silent: true })));
      toast({ title: `🗑️ ${refs.length} fichas limpas com sucesso!` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao limpar", description: "Algumas fichas podem não ter sido limpas." });
    } finally {
      setIsClearingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium animate-pulse">Carregando lista de alunos selecionados...</p>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 text-center">
        <div className="bg-muted p-6 rounded-full">
          <BookOpen size={48} className="text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Nenhum aluno selecionado</h1>
          <p className="text-muted-foreground max-w-md">
            Selecione um ou mais alunos na tela de Gestão (check azul) antes de acessar a impressão em lote.
          </p>
        </div>
        <Button onClick={() => router.push("/gestao")} variant="outline" className="gap-2">
          <ArrowLeft size={18} /> Voltar para Gestão
        </Button>
      </div>
    );
  }

  const inicioAtual = limite === -1 ? 1 : pagina * limite + 1;
  const fimAtual = limite === -1 ? students.length : Math.min((pagina + 1) * limite, students.length);

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white pb-20 print-mode-ficha">

      {/* Barra de Ferramentas - Fixa */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b shadow-sm print:hidden">
        <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">

          {/* Esquerda: Voltar + Título */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft size={16} className="mr-1" /> Voltar
            </Button>
            <div className="h-5 w-px bg-border" />
            <div>
              <h1 className="font-bold text-sm flex items-center gap-1.5">
                Impressão em Lote:
                <span className="text-primary">{students.length} Fichas</span>
                <span className="text-muted-foreground font-normal text-xs">
                  (exibindo {inicioAtual}–{fimAtual})
                </span>
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Ano Letivo {selectedYear}</p>
            </div>
          </div>

          {/* Centro: Preencher Rápido */}
          <div className="hidden lg:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border border-primary/10">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Preencher:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleGlobalBulkFill('HIGH')}
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all bg-[#04a74c]"
                title="Tudo Verde"
              />
              <button
                onClick={() => handleGlobalBulkFill('MEDIUM')}
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all flex overflow-hidden"
                title="Tudo Médio"
              >
                <div className="flex-1 bg-[#8c3127]" />
                <div className="flex-1 bg-[#04a74c]" />
              </button>
              <button
                onClick={() => handleGlobalBulkFill('LOW')}
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all bg-[#8c3127]"
                title="Tudo Vermelho"
              />
            </div>
          </div>

          {/* Direita: Salvar + Limpar + Imprimir */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAll}
              disabled={!isRendered || isSavingAll || isClearingAll}
              className="h-9 gap-1.5 font-bold"
            >
              {isSavingAll ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={!isRendered || isSavingAll || isClearingAll}
              className="h-9 gap-1.5 font-bold text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {isClearingAll ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
              Limpar
            </Button>
            <Button
              onClick={() => window.print()}
              disabled={!isRendered}
              className="h-9 gap-1.5 font-bold shadow-md"
            >
              {isRendered ? <Printer size={16} /> : <Loader2 size={16} className="animate-spin" />}
              {isRendered ? "Imprimir" : "Preparando..."}
            </Button>
          </div>
        </div>

        {/* Barra de Paginação / Exibição */}
        <div className="container mx-auto px-4 py-2 border-t flex flex-wrap items-center justify-between gap-3">

          {/* Seleção de quantidade */}
          <div className="flex items-center gap-2">
            <List size={14} className="text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Exibir:</span>
            <div className="flex gap-1">
              {LIMITE_OPCOES.map(op => (
                <button
                  key={op}
                  onClick={() => handleChangeLimite(op)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold border transition-all",
                    limite === op
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {op === -1 ? "Todas" : op}
                </button>
              ))}
            </div>
          </div>

          {/* Navegação de páginas (só aparece se não for "Todas") */}
          {limite !== -1 && totalPaginas > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina(0)}
                disabled={pagina === 0}
                className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Primeira página"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={pagina === 0}
                className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Página anterior"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex gap-1 mx-1">
                {Array.from({ length: totalPaginas }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPagina(i)}
                    className={cn(
                      "w-7 h-7 rounded text-xs font-bold border transition-all",
                      i === pagina
                        ? "bg-primary text-white border-primary"
                        : "bg-background hover:bg-muted border-border text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
                disabled={pagina >= totalPaginas - 1}
                className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Próxima página"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setPagina(totalPaginas - 1)}
                disabled={pagina >= totalPaginas - 1}
                className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Última página"
              >
                <ChevronsRight size={14} />
              </button>

              <span className="ml-2 text-[11px] text-muted-foreground font-bold">
                Pág. {pagina + 1} de {totalPaginas}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Overlay de carregamento */}
      {!isRendered && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 print:hidden">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-bold">Gerando {studentsPagina.length} fichas...</p>
          <p className="text-xs text-muted-foreground">Aguarde alguns instantes.</p>
        </div>
      )}

      {/* Área de Impressão */}
      <div className="py-8 flex flex-col items-center gap-0 print:p-0 print:m-0 print-forced-a4">
        {studentsPagina.map((student) => (
          <div key={student.id} className="mb-0 print:m-0 print:w-[210mm] print:p-0">
            <StudentEvaluationReport
              ref={el => { if (el) reportRefs.current[student.id] = el; }}
              student={student}
              selectedYear={selectedYear}
              hideControls={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BulkFichasPage() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center justify-center font-bold text-muted-foreground w-full">Carregando ambiente...</div>}>
      <BulkFichasContent />
    </Suspense>
  );
}
