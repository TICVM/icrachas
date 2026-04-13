"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useFirestore, useCollection, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, writeBatch } from "firebase/firestore";
import { type Student, type SchoolSegment, type SchoolClass, type SystemConfig } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Users, 
  FilterX, 
  Loader2, 
  LayoutGrid,
  UserCircle,
  ListFilter,
  Layers,
  Camera,
  ScanFace,
  RefreshCw,
  UserCheck,
  ChevronRight,
  List,
  Filter,
  Printer,
  CheckSquare,
  Square,
  ArrowRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { identifyStudent } from "@/ai/flows/identify-student-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import StudentList from "@/components/student-list";

export default function PortalPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSegmentoId, setFilterSegmentoId] = useState<string | null>(null);
  const [filterTurma, setFilterTurma] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState("carometro");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');


  // Estados Camera/Reconhecimento
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedStudent, setIdentifiedStudent] = useState<Student | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const firestore = useFirestore();
  const { user } = useUser();

  const alunosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'alunos');
  }, [firestore, user]);

  const segmentosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'segmentos'), orderBy('ordem', 'asc'));
  }, [firestore, user]);

  const turmasCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'turmas'), orderBy('ordem', 'asc'));
  }, [firestore, user]);

  const { data: studentsData, isLoading } = useCollection<Student>(alunosCollection);
  const { data: segmentsData } = useCollection<SchoolSegment>(segmentosCollection);
  const { data: classesData } = useCollection<SchoolClass>(turmasCollection);

  const configRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'configuracoes', 'geral') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configRef);

  const cardsPerRow = configData?.carometroCardsPerRow || 10;
  const borderRadius = configData?.carometroBorderRadius !== undefined ? configData.carometroBorderRadius : 16;
  const scale = (configData?.carometroCardScale || 100) / 100;
  const gap = configData?.carometroGap !== undefined ? configData.carometroGap : 16;
  const shadowIntensity = configData?.carometroShadowIntensity !== undefined ? configData.carometroShadowIntensity : 0.03;
  const fontSize = configData?.carometroFontSize || 12;
  const badgeBorderRadius = configData?.carometroBadgeBorderRadius !== undefined ? configData.carometroBadgeBorderRadius : 20;
  const buttonBorderRadius = configData?.carometroButtonBorderRadius !== undefined ? configData.carometroButtonBorderRadius : 4;

  const students = (studentsData || []).filter(s => s.ativo !== false);
  const schoolSegments = segmentsData || [];
  const schoolClasses = classesData || [];

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      counts[s.turma] = (counts[s.turma] || 0) + 1;
    });
    return counts;
  }, [students]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      counts[s.segmento] = (counts[s.segmento] || 0) + 1;
    });
    return counts;
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = [...students];
    if (filterSegmentoId) {
      const seg = schoolSegments.find(s => s.id === filterSegmentoId);
      if (seg) result = result.filter(s => s.segmento === seg.nome);
    }
    if (filterTurma) {
      result = result.filter(s => s.turma === filterTurma);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => s.nome.toLowerCase().includes(term));
    }
    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [students, filterSegmentoId, filterTurma, searchTerm, schoolSegments]);

  const handleBulkToggleEnabled = async (enabled: boolean) => {
    if (filteredStudents.length === 0 || !firestore) return;
    
    for (let i = 0; i < filteredStudents.length; i += 500) {
      const batch = writeBatch(firestore);
      filteredStudents.slice(i, i + 500).forEach(s => batch.update(doc(firestore, 'alunos', s.id), { enabled }));
      await batch.commit();
    }
    
    toast({ title: enabled ? "Seleção de impressão atualizada" : "Seleção removida" });
  };

  const startCamera = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (error) {
      console.error('Erro ao acessar camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Câmera Bloqueada',
        description: 'Por favor, permita o acesso à câmera nas configurações do navegador.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleCaptureAndIdentify = async () => {
    if (!videoRef.current || students.length === 0) {
      toast({ variant: "destructive", title: "Câmera não pronta", description: "Aguarde a inicialização da câmera." });
      return;
    }
    
    setIsIdentifying(true);
    setIdentifiedStudent(null);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context error");
      
      ctx.drawImage(videoRef.current, 0, 0);
      const photoDataUri = canvas.toDataURL('image/jpeg', 0.8);

      const candidatesList = filteredStudents.length > 0 ? filteredStudents : students;
      const candidates = candidatesList
        .filter(s => !!s.fotoUrl && (s.fotoUrl.startsWith('data:') || s.fotoUrl.startsWith('http')))
        .slice(0, 20)
        .map(s => ({
          id: s.id,
          nome: s.nome,
          fotoUrl: s.fotoUrl
        }));

      if (candidates.length === 0) {
        toast({ variant: "destructive", title: "Sem dados", description: "Não há alunos com fotos de referência para comparar." });
        setIsIdentifying(false);
        return;
      }

      const result = await identifyStudent({ photoDataUri, candidates });

      if (result.studentId) {
        const found = students.find(s => s.id === result.studentId);
        if (found) {
          setIdentifiedStudent(found);
          toast({ title: "Aluno Identificado!", description: `Identificado como ${found.nome}` });
        }
      } else {
        toast({ 
          variant: "destructive", 
          title: "Não Identificado", 
          description: "Nenhum aluno correspondente encontrado no banco de dados." 
        });
      }
    } catch (error) {
      console.error("Erro no reconhecimento:", error);
      toast({ variant: "destructive", title: "Erro na IA", description: "Falha ao processar a identificação facial." });
    } finally {
      setIsIdentifying(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === "facial") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeMainTab]);

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-700 w-full min-w-0 max-w-[100vw] overflow-x-hidden print-mode-carometro">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/30 text-primary px-3 mb-2 font-black tracking-widest uppercase text-[10px]">Portal de Identificação</Badge>
          <h1 className="text-4xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">Carômetro Digital</h1>
          <p className="text-muted-foreground font-medium">Localize alunos e acesse fichas individuais rapidamente.</p>
        </div>

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="bg-white/50 p-1.5 rounded-2xl border shadow-sm">
          <TabsList className="bg-transparent border-none p-0">
            <TabsTrigger value="carometro" className="gap-2 h-10 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
              <LayoutGrid size={14} /> Carômetro
            </TabsTrigger>
            <TabsTrigger value="facial" className="gap-2 h-10 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
              <ScanFace size={14} /> Busca Facial
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsContent value="carometro" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <Card className="border-none shadow-xl shadow-primary/5 overflow-hidden rounded-3xl">
            <CardContent className="p-6 md:p-8 space-y-8">
              <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40" />
                  <Input 
                    placeholder="Quem você está procurando?" 
                    className="pl-12 h-14 text-lg font-bold bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-2xl shrink-0">
                  <Button 
                    variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest px-6"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={16} className="mr-2" /> Grade
                  </Button>
                  <Button 
                    variant={viewMode === 'table' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-11 rounded-xl font-black uppercase text-[10px] tracking-widest px-6"
                    onClick={() => setViewMode('table')}
                  >
                    <List size={16} className="mr-2" /> Lista
                  </Button>
                </div>
              </div>

                <div className="space-y-4 border rounded-2xl p-4 bg-white/50 shadow-sm mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 pl-1">
                        <ListFilter size={12} /> FILTRAR POR SEGMENTO (LISTA)
                      </Label>
                      <Select value={filterSegmentoId || "all"} onValueChange={(val) => { setFilterSegmentoId(val === "all" ? null : val); setFilterTurma(null); }}>
                        <SelectTrigger className="h-9 rounded-xl bg-white focus:ring-primary/20 text-sm">
                          <SelectValue placeholder="Todos os Segmentos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Segmentos ({students.length})</SelectItem>
                          {schoolSegments.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nome} ({segmentCounts[s.nome] || 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 pl-1">
                        <Filter size={12} /> FILTRAR POR TURMA (LISTA)
                      </Label>
                      <Select value={filterTurma || "all"} onValueChange={(val) => setFilterTurma(val === "all" ? null : val)}>
                        <SelectTrigger className="h-9 rounded-xl bg-white focus:ring-primary/20 hover:bg-white text-muted-foreground w-full text-sm">
                          <SelectValue placeholder="Todas as Turmas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Turmas</SelectItem>
                          {schoolClasses
                            .filter(c => !filterSegmentoId || c.segmentoId === filterSegmentoId)
                            .map(t => (
                              <SelectItem key={t.id} value={t.nome}>
                                {t.nome} ({classCounts[t.nome] || 0})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-dashed w-full overflow-hidden">
                    <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 pl-1">
                      <Layers size={12} /> ATALHOS POR SEGMENTO (BOTÕES)
                    </Label>
                    <ScrollArea className="w-full max-w-full whitespace-nowrap pb-2">
                      <div className="flex w-max space-x-2 px-1">
                        <Button 
                          variant={filterSegmentoId === null ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => { setFilterSegmentoId(null); setFilterTurma(null); }}
                          className="h-9 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                        >
                          Todos
                        </Button>
                        {schoolSegments.map(s => (
                          <Button 
                            key={s.id} 
                            variant={filterSegmentoId === s.id ? "default" : "outline"} 
                            size="sm" 
                            onClick={() => { setFilterSegmentoId(s.id); setFilterTurma(null); }}
                            className="h-9 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 transition-all"
                          >
                            {s.nome} <span className={filterSegmentoId === s.id ? "opacity-70" : "text-muted-foreground"}>({segmentCounts[s.nome] || 0})</span>
                          </Button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" className="h-1.5" />
                    </ScrollArea>
                  </div>

                  {filterSegmentoId && (
                    <div className="space-y-2 pt-1 w-full overflow-hidden">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 pl-1">
                        <Layers size={12} /> ATALHOS POR TURMA (BOTÕES)
                      </Label>
                      <ScrollArea className="w-full max-w-full whitespace-nowrap pb-2">
                        <div className="flex w-max space-x-2 px-1">
                          <Button 
                            variant={filterTurma === null ? "default" : "outline"} 
                            size="sm" 
                            onClick={() => setFilterTurma(null)}
                            className="h-9 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                          >
                            Todas
                          </Button>
                          {schoolClasses
                            .filter(c => c.segmentoId === filterSegmentoId)
                            .map(t => (
                              <Button 
                                key={t.id} 
                                variant={filterTurma === t.nome ? "default" : "outline"} 
                                size="sm" 
                                onClick={() => setFilterTurma(t.nome)}
                                className="h-9 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 transition-all"
                              >
                                {t.nome} <span className={filterTurma === t.nome ? "opacity-70" : "text-muted-foreground"}>({classCounts[t.nome] || 0})</span>
                              </Button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="h-1.5" />
                      </ScrollArea>
                    </div>
                  )}
                </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                <Button variant="outline" size="sm" onClick={() => handleBulkToggleEnabled(true)} className="h-9 rounded-xl font-bold text-[10px] uppercase border-primary/20 hover:bg-primary/5 text-primary">
                  <CheckSquare size={14} className="mr-2" /> Selecionar Tudo
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkToggleEnabled(false)} className="h-9 rounded-xl font-bold text-[10px] uppercase">
                  <Square size={14} className="mr-2" /> Desmarcar Tudo
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button 
                    onClick={() => router.push(`/fichas/bulk?year=${new Date().getFullYear()}`)}
                    className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase px-6"
                  >
                    <Printer size={14} className="mr-2" /> Imprimir Lote
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-[10px]">Sincronizando portal...</p>
            </div>
          ) : filteredStudents.length > 0 ? (
            viewMode === 'grid' ? (
              <div 
                className="grid grid-cols-2 md:[grid-template-columns:var(--cards-per-row)] pt-4 print-carometro-grid"
                style={{ 
                  gap: `${gap}px`,
                  '--cards-per-row': `repeat(${cardsPerRow}, minmax(0, 1fr))`
                } as React.CSSProperties}
              >
                {filteredStudents.map((student) => (
                  <Card 
                    key={student.id} 
                    className="card-hover overflow-hidden border-none bg-card group relative mx-auto w-full transition-all duration-300"
                    style={{ 
                      borderRadius: `${borderRadius}px`,
                      boxShadow: `0 10px 30px rgba(0,0,0,${shadowIntensity})`
                    }}
                  >
                    <CardContent className="p-0">
                      <div className="aspect-[3/4] relative bg-muted overflow-hidden">
                        {student.fotoUrl ? (
                          <img src={student.fotoUrl} alt={student.nome} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <UserCircle className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                           <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 text-[9px] font-black uppercase tracking-widest w-full gap-2 border-white/20 bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all" 
                            style={{ borderRadius: `${buttonBorderRadius}px` }}
                            onClick={() => router.push(`/fichas?studentId=${student.id}`)}
                           >
                              Ficha <ArrowRight size={10} />
                           </Button>
                        </div>
                      </div>
                      <div className="p-3 text-center bg-card flex flex-col gap-1 min-h-[70px] justify-center relative w-full overflow-hidden">
                        <p className="font-black font-sans uppercase tracking-tight leading-none text-slate-800 break-words line-clamp-2" style={{ fontSize: `${fontSize}px` }}>
                          {student.nome}
                        </p>
                        <p 
                          className="text-[8px] text-primary/60 font-black uppercase tracking-[0.2em] bg-primary/5 px-2 py-1 inline-block mx-auto border border-primary/10"
                          style={{ borderRadius: `${badgeBorderRadius}px` }}
                        >
                          {student.turma}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-2xl shadow-primary/5 border-none rounded-3xl overflow-hidden">
                <StudentList 
                  students={filteredStudents} 
                  models={[]} 
                  allStudents={students} 
                  onUpdate={() => {}} 
                  onDelete={() => {}} 
                  viewMode="table" 
                  segments={schoolSegments} 
                  classes={schoolClasses} 
                />
              </Card>
            )
          ) : (
            <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-4 border-dashed border-muted">
              <FilterX className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Ninguém encontrado</p>
              <Button variant="link" onClick={() => { setFilterSegmentoId(null); setFilterTurma(null); setSearchTerm(""); }} className="mt-2 font-bold">Limpar Filtros</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="facial" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <Card className="border-none shadow-2xl shadow-primary/10 overflow-hidden rounded-[2.5rem] bg-[#0a0a0c]">
                <CardContent className="p-0 bg-black relative aspect-[4/3] flex items-center justify-center overflow-hidden">
                  <video ref={videoRef} className="w-full h-full object-cover opacity-80" autoPlay muted playsInline />
                  
                  {isIdentifying && (
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center gap-6 z-10 transition-all">
                      <div className="relative">
                        <ScanFace className="h-24 w-24 text-white animate-pulse" />
                        <Loader2 className="h-32 w-32 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
                      </div>
                      <p className="text-white font-black text-sm tracking-[0.3em] uppercase animate-pulse">Neural Identify...</p>
                    </div>
                  )}

                  <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                     <div className="w-full h-full border-2 border-primary/40 rounded-[2rem] relative">
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-primary rounded-tl-3xl shadow-[0_0_20px_rgba(var(--primary),0.5)]"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-primary rounded-tr-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-primary rounded-bl-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-primary rounded-br-3xl"></div>
                        
                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-primary/20 animate-scan shadow-[0_0_15px_rgba(var(--primary),1)]"></div>
                     </div>
                  </div>
                </CardContent>
                <div className="p-8 space-y-4">
                  <Button 
                    className="w-full h-16 text-xl font-black uppercase tracking-[0.2em] gap-4 bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/30 rounded-2xl" 
                    onClick={handleCaptureAndIdentify}
                    disabled={isIdentifying || hasCameraPermission === false}
                  >
                    {isIdentifying ? <Loader2 className="animate-spin" /> : <ScanFace size={28} />}
                    Identificar
                  </Button>
                  <Button variant="ghost" className="w-full text-white/40 hover:text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest" onClick={startCamera}>
                    <RefreshCw size={14} className="mr-2" /> Resetar Câmera
                  </Button>
                </div>
             </Card>

             <div className="space-y-6">
                <Card className={cn(
                  "border-none transition-all duration-1000 min-h-[500px] flex flex-col rounded-[2.5rem] shadow-2xl",
                  identifiedStudent ? "bg-white border-4 border-primary/20 ring-8 ring-primary/5" : "bg-muted/30 border-2 border-dashed border-muted-foreground/20"
                )}>
                   <CardContent className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    {identifiedStudent ? (
                      <div className="animate-in zoom-in-75 duration-700 space-y-8 w-full">
                        <div className="relative mx-auto w-56 h-72 rounded-[2rem] overflow-hidden border-[10px] border-white shadow-2xl">
                          <img src={identifiedStudent.fotoUrl} className="w-full h-full object-cover" alt={identifiedStudent.nome} />
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end justify-center p-4">
                             <Badge className="bg-white text-primary font-black px-4 py-1 rounded-lg">99% MATCH</Badge>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">{identifiedStudent.nome}</h3>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                             <Badge variant="secondary" className="px-6 py-2 font-black bg-primary/5 border border-primary/10 text-primary rounded-xl uppercase tracking-widest text-[10px]">{identifiedStudent.segmento}</Badge>
                             <Badge variant="outline" className="px-6 py-2 font-black border-slate-200 text-slate-500 bg-slate-50 rounded-xl uppercase tracking-widest text-[10px]">{identifiedStudent.turma}</Badge>
                          </div>
                        </div>
                        <div className="pt-4 flex flex-col gap-3">
                           <Button className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl" onClick={() => router.push(`/fichas?studentId=${identifiedStudent.id}`)}>
                             Ver Ficha de Avaliação
                           </Button>
                           <Button variant="ghost" className="w-full font-bold text-muted-foreground uppercase text-[10px] tracking-widest" onClick={() => setIdentifiedStudent(null)}>
                             Nova Captura
                           </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 opacity-20">
                        <div className="bg-white/50 p-12 rounded-[2.5rem] inline-block shadow-inner">
                           <ScanFace size={80} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-muted-foreground uppercase tracking-[0.3em]">IA Biométrica</p>
                          <p className="text-sm text-muted-foreground mt-4 font-bold uppercase tracking-widest px-12">Aguardando dados de imagem para análise neural.</p>
                        </div>
                      </div>
                    )}
                   </CardContent>
                </Card>
             </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
