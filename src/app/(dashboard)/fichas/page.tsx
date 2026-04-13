"use client";

import React, { useState, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Student } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, BookOpen, Share2, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentEvaluationReport, { StudentEvaluationReportRef } from "@/components/student-evaluation-report";
import { Save, Eraser, Printer, ArrowLeft, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function FichasPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedTrimester, setSelectedTrimester] = useState("t1");
  const reportRef = React.useRef<StudentEvaluationReportRef>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  const handleCompartilhar = async () => {
    if (!firestore || !selectedStudent) return;
    setIsSharing(true);
    try {
      // Gera token único
      const token = `${selectedStudent.id}_${selectedYear}_${Date.now().toString(36)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // válido por 30 dias

      await setDoc(doc(firestore, 'shared_reports', token), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.nome,
        year: selectedYear,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
      });

      const url = `${window.location.origin}/view/${token}`;
      await navigator.clipboard.writeText(url);
      setLinkCopiado(true);
      toast({
        title: "✅ Link copiado!",
        description: `Link válido por 30 dias copiado para a área de transferência.`,
      });
      setTimeout(() => setLinkCopiado(false), 3000);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao gerar link", description: "Tente novamente." });
    } finally {
      setIsSharing(false);
    }
  };

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'alunos'), orderBy('nome', 'asc'));
  }, [firestore, user]);

  const { data: students, isLoading: isStudentsLoading } = useCollection<Student>(studentsQuery);
  const isLoading = isStudentsLoading && !students;

  useEffect(() => {
    if (typeof window !== 'undefined' && students && students.length > 0 && !selectedStudent) {
      const params = new URLSearchParams(window.location.search);
      const studentId = params.get('studentId');
      if (studentId) {
        const found = students.find(s => s.id === studentId);
        if (found) {
          setSelectedStudent(found);
          window.history.replaceState({}, '', '/fichas');
        }
      }
    }
  }, [students, selectedStudent]);

  const filteredStudents = (students || []).filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.turma.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10); // limited suggestions

  return (
    <div className="min-h-screen bg-transparent pb-20 print:pb-0 print:bg-white print:block print-mode-ficha">
      <main className="container mx-auto p-4 md:p-8 print:p-0 print:m-0 print:max-w-none print:w-full print:block">
        {!selectedStudent ? (
          <div className="max-w-4xl mx-auto space-y-6 print:hidden">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                Fichas de Avaliação Individual
              </h2>
              <p className="text-muted-foreground mt-1">Busque um aluno para gerar ou visualizar a ficha da avaliação trimestral.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Selecionar Aluno</CardTitle>
                <CardDescription>Procure pelo nome do aluno ou turma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar aluno..." 
                    className="pl-10 h-14 text-lg bg-muted/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {isLoading ? (
                  <div className="flex justify-center p-6"><Loader2 className="animate-spin text-primary" /></div>
                ) : searchTerm.length > 0 ? (
                  <div className="border rounded-xl divide-y overflow-hidden max-h-96 overflow-y-auto">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(student => (
                        <div key={student.id} className="p-3 hover:bg-muted/50 flex justify-between items-center transition-colors">
                          <div>
                            <p className="font-bold">{student.nome}</p>
                            <p className="text-xs text-muted-foreground">{student.segmento} - {student.turma}</p>
                          </div>
                          <Button onClick={() => setSelectedStudent(student)}>
                            Preencher Ficha
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">Nenhum aluno encontrado.</div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl opacity-60">
                    Digite um nome para buscar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PAINEL DE CONTROLE EXTERNO */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-3 md:pb-4 mb-4 md:mb-6 pt-2 print:hidden px-4 md:px-0">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 max-w-7xl mx-auto">
                <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="h-8 md:h-9 px-2 md:px-3">
                    <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Voltar</span>
                  </Button>
                  <div className="h-4 w-px bg-border hidden md:block mx-1" />
                  <div className="flex items-center gap-1.5 md:gap-2 bg-muted/40 px-2 md:px-3 py-1 rounded-lg border">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                    <span className="text-[10px] md:text-sm font-bold whitespace-nowrap">Ano:</span>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-[10px] md:text-sm font-bold min-w-[60px] md:min-w-[80px] cursor-pointer"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y.toString()}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-2 bg-muted/40 px-2 md:px-3 py-1 rounded-lg border">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                    <span className="text-[10px] md:text-sm font-bold whitespace-nowrap">Período:</span>
                    <select 
                      value={selectedTrimester}
                      onChange={(e) => setSelectedTrimester(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-[10px] md:text-sm font-bold min-w-[80px] md:min-w-[100px] cursor-pointer"
                    >
                      <option value="t1">1º Trimestre</option>
                      <option value="t2">2º Trimestre</option>
                      <option value="t3">3º Trimestre</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1 md:gap-2 w-full md:w-auto overflow-x-auto no-scrollbar py-1">
                   {/* Preenchimento Rápido */}
                   <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border mr-1 md:mr-2 flex-shrink-0">
                     <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground px-1 md:px-2 uppercase tracking-tighter hidden xs:inline">Fio:</span>
                     <button 
                        onClick={() => reportRef.current?.bulkFill('HIGH')} 
                        className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all bg-[#04a74c]" 
                        title="Tudo Verde"
                      />
                      <button 
                        onClick={() => reportRef.current?.bulkFill('MEDIUM')} 
                        className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all font-bold flex overflow-hidden" 
                        title="Tudo Médio"
                      >
                        <div className="flex-1 bg-[#8c3127]" />
                        <div className="flex-1 bg-[#04a74c]" />
                      </button>
                      <button 
                        onClick={() => reportRef.current?.bulkFill('LOW')} 
                        className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all bg-[#8c3127]" 
                        title="Tudo Vermelho"
                      />
                   </div>

                   <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => reportRef.current?.save()}
                    className="h-8 md:h-9 px-2 md:px-3 font-medium flex-shrink-0"
                    title="Salvar"
                  >
                    <Save className="h-4 w-4 md:mr-1.5" /> <span className="hidden sm:inline">Salvar</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => reportRef.current?.reset()}
                    className="h-8 md:h-9 px-2 md:px-3 font-medium text-destructive hover:text-destructive flex-shrink-0"
                    title="Limpar"
                  >
                    <Eraser className="h-4 w-4 md:mr-1.5" /> <span className="hidden sm:inline">Limpar</span>
                  </Button>
                  <Button 
                    onClick={() => window.print()} 
                    size="sm"
                    className="h-8 md:h-9 px-2 md:px-3 font-bold bg-primary hover:bg-primary/90 flex-shrink-0"
                    title="Imprimir"
                  >
                    <Printer className="h-4 w-4 md:mr-1.5" /> <span className="hidden sm:inline">Imprimir</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCompartilhar}
                    disabled={isSharing}
                    className="h-8 md:h-9 px-2 md:px-3 font-bold gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 flex-shrink-0"
                    title="Compartilhar Link Público"
                  >
                    {isSharing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : linkCopiado ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{linkCopiado ? "Copiado!" : "Compartilhar"}</span>
                  </Button>
                </div>
              </div>
              
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground px-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Editando: <span className="font-bold text-foreground">{selectedStudent.nome}</span>
              </div>
            </div>
            
            <div className="flex justify-center print:block print:w-full print-forced-a4">
              <StudentEvaluationReport 
                ref={reportRef}
                student={selectedStudent} 
                selectedYear={selectedYear}
                selectedTrimester={selectedTrimester}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
