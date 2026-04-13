"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { type Student, type BadgeModel, type SchoolSegment, type SchoolClass, type SystemConfig, type FichaLayout } from "@/lib/types";
import AddStudentCard from "@/components/add-student-card";
import StudentList from "@/components/student-list";
import {
  useFirestore,
  useCollection,
  useUser,
  useMemoFirebase,
  useAuth,
  useDoc
} from "@/firebase";
import {
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking
} from "@/firebase/non-blocking-updates";
import { collection, doc, query, orderBy, writeBatch, getDocs, where, addDoc, updateDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  School,
  Database,
  Search,
  Plus,
  Trash2,
  Layers,
  ArrowRightLeft,
  UserMinus,
  UserCheck,
  Archive,
  Loader2,
  Settings,
  FileJson,
  CheckCircle2,
  XCircle,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  UserCircle,
  Save,
  MoveHorizontal,
  Printer,
  BookOpen,
  Layout,
  Calendar,
  Info,
  Globe,
  Palette,
  RefreshCw,
  UserPlus,
  ListFilter,
  Lock,
  Filter,
  Pencil,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Code
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BulkImportCard from "@/components/bulk-import-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import FichaLayoutManager from "@/components/ficha-layout-manager";
import { createUserWithEmailAndPassword, getAuth as getAuthSecondary } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";

const registerSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "Mínimo 6 caracteres."),
  confirmPassword: z.string().min(6, "Mínimo 6 caracteres."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type RegisterValues = z.infer<typeof registerSchema>;

function parseSigaTurma(raw: string) {
  if (!raw || !raw.includes('/')) return { segmento: 'Sincronizado', turma: raw || 'SIGA' };

  const parts = raw.split('/').map(p => p.trim());
  let segmento = parts[0];

  if (segmento === 'EI' || segmento === 'INF') segmento = 'Educação Infantil';
  else if (segmento === 'EF' || segmento === 'FUND') segmento = 'Ensino Fundamental';
  else if (segmento === 'EM' || segmento === 'MED') segmento = 'Ensino Médio';

  const ano = parts[1] || '';
  const turmaLetra = parts[2]?.split('-')[0].trim() || '';
  const turma = `${ano} ${turmaLetra}`.trim();

  return { segmento, turma };
}

export default function GestaoPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("alunos");
  const [showTransferred, setShowTransferred] = useState(false);
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState(false);

  const [filterSegmentoId, setFilterSegmentoId] = useState<string | null>(null);
  const [filterTurma, setFilterTurma] = useState<string | null>(null);

  const [isSyncingSiga, setIsSyncingSiga] = useState(false);
  const [isProcessingManual, setIsProcessingManual] = useState(false);

  const [jsonAlunos, setJsonAlunos] = useState("");
  const [jsonFotos, setJsonFotos] = useState("");
  const [jsonTurmas, setJsonTurmas] = useState("");
  const [previewImportList, setPreviewImportList] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [previewSearchTerm, setPreviewSearchTerm] = useState("");

  const [newSegmentName, setNewSegmentName] = useState("");
  const [newSegmentOrder, setNewSegmentOrder] = useState(1);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassOrder, setNewClassOrder] = useState(1);
  const [newClassSegmentId, setNewClassSegmentId] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [classFilterSegmentId, setClassFilterSegmentId] = useState<string>("all");

  const [editingSegment, setEditingSegment] = useState<SchoolSegment | null>(null);
  const [isEditSegDialogOpen, setIsEditSegDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false);

  const [migrationSourceTurma, setMigrationSourceTurma] = useState("");
  const [migrationTargetTurma, setMigrationTargetTurma] = useState("");
  const [migrationTargetSegmentId, setMigrationTargetSegmentId] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSourceSegName, setMigrationSourceSegName] = useState("");
  const [migrationTargetSegId, setMigrationTargetSegId] = useState("");
  const [isMigratingSeg, setIsMigratingSeg] = useState(false);

  const [targetSelectedSegmentId, setTargetSelectedSegmentId] = useState("");
  const [targetSelectedTurmaName, setTargetSelectedTurmaName] = useState("");
  const [isMigratingSelected, setIsMigratingSelected] = useState(false);

  const [logoBase64, setLogoBase64] = useState("");
  const [logoHeight, setLogoHeight] = useState(48);
  const [logoFichaBase64, setLogoFichaBase64] = useState("");
  const [logoFichaHeight, setLogoFichaHeight] = useState(48);
  const [sigaUrl, setSigaUrl] = useState("");
  const [sigaToken, setSigaToken] = useState("");
  const [sigaUsername, setSigaUsername] = useState("");
  const [sigaPassword, setSigaPassword] = useState("");
  const [carometroCardsPerRow, setCarometroCardsPerRow] = useState(10);
  const [carometroBorderRadius, setCarometroBorderRadius] = useState(16);
  const [carometroCardScale, setCarometroCardScale] = useState(100);
  const [carometroGap, setCarometroGap] = useState(16);
  const [carometroShadowIntensity, setCarometroShadowIntensity] = useState(0.03);
  const [carometroFontSize, setCarometroFontSize] = useState(12);
  const [carometroBadgeBorderRadius, setCarometroBadgeBorderRadius] = useState(20);
  const [carometroButtonBorderRadius, setCarometroButtonBorderRadius] = useState(4);
  const [activeTrimesterId, setActiveTrimesterId] = useState("t1");
  const [newProfessorName, setNewProfessorName] = useState("");
  const [hasLoadedConfig, setHasLoadedConfig] = useState(false);

  const configRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'configuracoes', 'geral') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configRef);

  useEffect(() => {
    if (configData && !hasLoadedConfig) {
      if (configData.logoUrl) setLogoBase64(configData.logoUrl);
      if (configData.logoHeight) setLogoHeight(configData.logoHeight);
      if (configData.logoFichaUrl) setLogoFichaBase64(configData.logoFichaUrl);
      if (configData.logoFichaHeight) setLogoFichaHeight(configData.logoFichaHeight);
      if (configData.sigaUrl) setSigaUrl(configData.sigaUrl);
      if (configData.sigaToken) setSigaToken(configData.sigaToken);
      if (configData.sigaUsername) setSigaUsername(configData.sigaUsername);
      if (configData.sigaPassword) setSigaPassword(configData.sigaPassword);
      if (configData.carometroCardsPerRow) setCarometroCardsPerRow(configData.carometroCardsPerRow);
      if (configData.carometroBorderRadius !== undefined) setCarometroBorderRadius(configData.carometroBorderRadius);
      if (configData.carometroCardScale) setCarometroCardScale(configData.carometroCardScale);
      if (configData.carometroGap) setCarometroGap(configData.carometroGap);
      if (configData.carometroShadowIntensity !== undefined) setCarometroShadowIntensity(configData.carometroShadowIntensity);
      if (configData.carometroFontSize) setCarometroFontSize(configData.carometroFontSize);
      if (configData.carometroBadgeBorderRadius !== undefined) setCarometroBadgeBorderRadius(configData.carometroBadgeBorderRadius);
      if (configData.carometroButtonBorderRadius !== undefined) setCarometroButtonBorderRadius(configData.carometroButtonBorderRadius);
      if (configData.activeTrimesterId) setActiveTrimesterId(configData.activeTrimesterId);
      
      setHasLoadedConfig(true);
    }
  }, [configData, hasLoadedConfig]);

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Faça login como administrador." });
      router.replace("/login");
    }
  }, [user, isUserLoading, router, toast]);

  const alunosCollection = useMemoFirebase(() => firestore && user ? collection(firestore, 'alunos') : null, [firestore, user]);
  const segmentsCollection = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'segmentos'), orderBy('ordem', 'asc')) : null, [firestore, user]);
  const turmasCollection = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'turmas'), orderBy('ordem', 'asc')) : null, [firestore, user]);
  const modelosCollection = useMemoFirebase(() => firestore && user ? collection(firestore, 'modelosCracha') : null, [firestore, user]);
  const fichaLayoutsCollection = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'fichas_layouts'), orderBy('nome', 'asc')) : null, [firestore, user]);

  const { data: studentsData } = useCollection<Student>(alunosCollection);
  const { data: segmentsData } = useCollection<SchoolSegment>(segmentsCollection);
  const { data: classesData } = useCollection<SchoolClass>(turmasCollection);
  const { data: modelsData } = useCollection<BadgeModel>(modelosCollection);
  const { data: layoutsData } = useCollection<FichaLayout>(fichaLayoutsCollection);

  const allStudents = studentsData || [];
  const schoolSegments = segmentsData || [];
  const schoolClasses = classesData || [];
  const models = modelsData || [];

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allStudents.forEach(s => {
      if (s.ativo !== false) {
        counts[s.turma] = (counts[s.turma] || 0) + 1;
      }
    });
    return counts;
  }, [allStudents]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allStudents.forEach(s => {
      if (s.ativo !== false) {
        counts[s.segmento] = (counts[s.segmento] || 0) + 1;
      }
    });
    return counts;
  }, [allStudents]);

  const filteredStudents = useMemo(() => {
    let result = allStudents.filter(s => showTransferred ? s.ativo === false : s.ativo !== false);
    if (filterSegmentoId) {
      const segName = schoolSegments.find(s => s.id === filterSegmentoId)?.nome;
      if (segName) result = result.filter(s => s.segmento === segName);
    }
    if (filterTurma) result = result.filter(s => s.turma === filterTurma);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => s.nome.toLowerCase().includes(term) || String(s.matricula).toLowerCase().includes(term));
    }
    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [allStudents, showTransferred, searchTerm, filterSegmentoId, filterTurma, schoolSegments]);

  const selectedInFilter = useMemo(() => filteredStudents.filter(s => s.enabled === true), [filteredStudents]);

  const handleBulkToggleEnabled = async (enabled: boolean, onlySelected: boolean = false) => {
    if (filteredStudents.length === 0 || !firestore) return;
    const list = onlySelected ? selectedInFilter : filteredStudents;
    
    for (let i = 0; i < list.length; i += 500) {
      const batch = writeBatch(firestore);
      list.slice(i, i + 500).forEach(s => batch.update(doc(firestore, 'alunos', s.id), { enabled }));
      await batch.commit();
    }
    
    toast({ title: enabled ? "Seleção de impressão atualizada" : "Seleção removida" });
  };

  const handleBulkToggleAtivo = async (ativo: boolean, apenasSelecionados: boolean = false) => {
    if (filteredStudents.length === 0 || !firestore) return;
    const listToUpdate = apenasSelecionados ? selectedInFilter : filteredStudents;
    
    for (let i = 0; i < listToUpdate.length; i += 500) {
      const batch = writeBatch(firestore);
      listToUpdate.slice(i, i + 500).forEach(s => batch.update(doc(firestore, 'alunos', s.id), { ativo }));
      await batch.commit();
    }
    
    toast({ title: ativo ? "Alunos reativados" : "Alunos transferidos" });
  };

  const handleBulkToggleVisibilidade = async (visivel: boolean, apenasSelecionados: boolean = false) => {
    if (filteredStudents.length === 0 || !firestore) return;
    const listToUpdate = apenasSelecionados ? selectedInFilter : filteredStudents;
    
    for (let i = 0; i < listToUpdate.length; i += 500) {
      const batch = writeBatch(firestore);
      listToUpdate.slice(i, i + 500).forEach(s => batch.update(doc(firestore, 'alunos', s.id), { visivelFila: visivel }));
      await batch.commit();
    }
    
    toast({ title: visivel ? "Alunos exibidos na fila" : "Alunos ocultos da fila" });
  };

  const handleBulkMigrateSelected = async () => {
    if (selectedInFilter.length === 0 || !firestore) {
      toast({ variant: "destructive", title: "Nenhum selecionado", description: "Marque os alunos com o check azul primeiro." });
      return;
    }
    if (!targetSelectedSegmentId || !targetSelectedTurmaName) {
      toast({ variant: "destructive", title: "Destino incompleto", description: "Selecione o segmento e a turma de destino." });
      return;
    }

    setIsMigratingSelected(true);
    try {
      const targetSeg = schoolSegments.find(s => s.id === targetSelectedSegmentId);
      if (!targetSeg) throw new Error("Segmento não encontrado.");

      for (let i = 0; i < selectedInFilter.length; i += 500) {
        const batch = writeBatch(firestore);
        selectedInFilter.slice(i, i + 500).forEach(s => {
          batch.update(doc(firestore, 'alunos', s.id), {
            segmento: targetSeg.nome,
            turma: targetSelectedTurmaName
          });
        });
        await batch.commit();
      }
      toast({ title: "Migração Concluída!", description: `${selectedInFilter.length} alunos movidos.` });
      setTargetSelectedSegmentId(""); setTargetSelectedTurmaName("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na migração", description: e.message });
    } finally {
      setIsMigratingSelected(false);
    }
  };

  const handleMigrateStudents = async () => {
    if (!migrationSourceTurma || !firestore) {
      toast({ variant: "destructive", title: "Seleção incompleta", description: "Escolha pelo menos a turma de origem." });
      return;
    }
    setIsMigrating(true);
    try {
      const q = query(collection(firestore, 'alunos'), where('turma', '==', migrationSourceTurma));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Nenhum aluno", description: "Não há alunos na turma de origem." });
        return;
      }
      const updates: any = {};
      if (migrationTargetTurma && migrationTargetTurma !== "UNCHANGED") updates.turma = migrationTargetTurma;
      if (migrationTargetSegmentId && migrationTargetSegmentId !== "UNCHANGED") {
        const seg = schoolSegments.find(s => s.id === migrationTargetSegmentId);
        if (seg) updates.segmento = seg.nome;
      }
      if (Object.keys(updates).length === 0) {
        toast({ variant: "destructive", title: "Ação vazia", description: "Selecione um destino (Turma ou Segmento)." });
        return;
      }
      for (let i = 0; i < snap.docs.length; i += 500) {
        const batch = writeBatch(firestore);
        snap.docs.slice(i, i + 500).forEach(d => batch.update(d.ref, updates));
        await batch.commit();
      }
      toast({ title: "Migração Concluída!", description: `${snap.size} alunos movidos.` });
      setMigrationSourceTurma(""); setMigrationTargetTurma(""); setMigrationTargetSegmentId("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na migração", description: e.message });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateSegment = async () => {
    if (!migrationSourceSegName || !migrationTargetSegId || !firestore) {
      toast({ variant: "destructive", title: "Seleção incompleta", description: "Escolha os segmentos de origem e destino." });
      return;
    }
    setIsMigratingSeg(true);
    try {
      const targetSeg = schoolSegments.find(s => s.id === migrationTargetSegId);
      if (!targetSeg) throw new Error("Segmento de destino não encontrado.");
      const q = query(collection(firestore, 'alunos'), where('segmento', '==', migrationSourceSegName));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ variant: "destructive", title: "Nenhum aluno", description: "Não há alunos no segmento de origem." });
        return;
      }
      for (let i = 0; i < snap.docs.length; i += 500) {
        const batch = writeBatch(firestore);
        snap.docs.slice(i, i + 500).forEach(d => batch.update(d.ref, { segmento: targetSeg.nome }));
        await batch.commit();
      }
      toast({ title: "Migração de Segmento Concluída!", description: `${snap.size} alunos movidos para ${targetSeg.nome}.` });
      setMigrationSourceSegName(""); setMigrationTargetSegId("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na migração", description: e.message });
    } finally {
      setIsMigratingSeg(false);
    }
  };

  const handleAnalyzeManualJson = () => {
    if (!jsonAlunos) {
      toast({ variant: "destructive", title: "Dados Ausentes", description: "O campo de Alunos é obrigatório." });
      return;
    }
    try {
      const alunosRaw = JSON.parse(jsonAlunos);
      const alunosList = alunosRaw.results || alunosRaw;
      let fotosList: any[] = [];
      let turmasList: any[] = [];
      try { if (jsonFotos) fotosList = JSON.parse(jsonFotos); } catch (e) { }
      try { if (jsonTurmas) turmasList = JSON.parse(jsonTurmas); } catch (e) { }
      const photosMap = new Map(fotosList.map(p => [p.id, p.s3]));
      const classesMap = new Map(turmasList.map(c => [c.id, c.turma_oficial]));
      const analyzed = alunosList.map((item: any) => {
        const { nome, matricula, id, ativo } = item;
        const photoUrl = photosMap.get(id) || "";
        const rawTurma = classesMap.get(id) || "";
        const { segmento, turma } = parseSigaTurma(rawTurma);
        return { nome: (nome || "").trim(), matricula: String(matricula || ""), segmento, turma, fotoUrl: photoUrl, ativo: ativo !== undefined ? !!ativo : true, idActivesoft: id };
      }).filter((a: any) => a.nome && a.matricula);
      setPreviewImportList(analyzed);
      setSelectedIndices(new Set(analyzed.map((_: any, i: number) => i)));
      toast({ title: "Análise concluída!", description: `${analyzed.length} alunos encontrados.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no JSON", description: "Verifique o formato dos dados." });
    }
  };

  const handleManualJsonProcess = async () => {
    if (selectedIndices.size === 0 || !firestore) {
      toast({ variant: "destructive", title: "Nenhuma seleção", description: "Selecione pelo menos um aluno." });
      return;
    }
    setIsProcessingManual(true);
    try {
      const listToImport = previewImportList.filter((_, i) => selectedIndices.has(i));
      const segmentMap = new Map();
      const classMap = new Map();
      schoolSegments.forEach(s => segmentMap.set(s.nome, s.id));
      schoolClasses.forEach(c => classMap.set(`${c.nome}-${c.segmentoId}`, c.id));
      let created = 0;
      let updated = 0;
      for (const student of listToImport) {
        let segmentId = segmentMap.get(student.segmento);
        if (!segmentId) {
          const newSegRef = await addDoc(collection(firestore, 'segmentos'), { nome: student.segmento, ordem: segmentMap.size + 1 });
          segmentId = newSegRef.id;
          segmentMap.set(student.segmento, segmentId);
        }
        const classKey = `${student.turma}-${segmentId}`;
        let classId = classMap.get(classKey);
        if (!classId) {
          const newClassRef = await addDoc(collection(firestore, 'turmas'), { nome: student.turma, segmentoId: segmentId, ordem: classMap.size + 1 });
          classId = newClassRef.id;
          classMap.set(classKey, classId);
        }
        const matStr = student.matricula;
        const q = query(collection(firestore, 'alunos'), where('matricula', '==', matStr));
        const snap = await getDocs(q);
        const studentData = { ...student, visivelFila: true, enabled: true, updatedAt: new Date().toISOString() };
        delete (studentData as any).idActivesoft;
        if (!snap.empty) {
          await updateDoc(doc(firestore, 'alunos', snap.docs[0].id), studentData);
          updated++;
        } else {
          await addDoc(collection(firestore, 'alunos'), studentData);
          created++;
        }
      }
      toast({ title: "Importação Concluída!", description: `${created} novos, ${updated} atualizados.` });
      setPreviewImportList([]); setSelectedIndices(new Set()); setJsonAlunos(""); setJsonFotos(""); setJsonTurmas("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na Gravação", description: e.message });
    } finally {
      setIsProcessingManual(false);
    }
  };

  const handlePullSigaSync = async () => {
    if (!sigaUrl) {
      toast({ variant: "destructive", title: "URL Ausente", description: "Defina a URL do SIGA em Sistema." });
      return;
    }
    setIsSyncingSiga(true);
    let currentToken = sigaToken;
    try {
      if (!currentToken && sigaUsername && sigaPassword) {
        const authResponse = await fetch('/api/siga-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sigaUrl, action: 'login', username: sigaUsername, password: sigaPassword })
        });
        if (authResponse.ok) {
          const authData = await authResponse.json();
          currentToken = authData.token;
        } else {
          const errData = await authResponse.json();
          throw new Error(errData.details || 'Falha na autenticação.');
        }
      }
      if (!currentToken) throw new Error('Credenciais ausentes.');
      const response = await fetch('/api/siga-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sigaUrl, token: currentToken })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || 'Erro na conexão com o SIGA.');
      }
      const body = await response.json();
      const items = body.results || body;
      if (!Array.isArray(items)) throw new Error('Resposta inválida.');
      let created = 0;
      let updated = 0;
      for (const item of items) {
        const { nome, matricula, ativo, turma_oficial, s3, fotoUrl } = item;
        if (!nome || !matricula) continue;
        const matStr = String(matricula);
        const q = query(collection(firestore!, 'alunos'), where('matricula', '==', matStr));
        const snap = await getDocs(q);
        const { segmento, turma } = parseSigaTurma(turma_oficial);
        const studentData = { nome: nome.trim(), matricula: matStr, segmento, turma, fotoUrl: s3 || fotoUrl || '', ativo: ativo !== undefined ? !!ativo : true, visivelFila: true, enabled: true, updatedAt: new Date().toISOString() };
        if (!snap.empty) {
          await updateDoc(doc(firestore!, 'alunos', snap.docs[0].id), studentData);
          updated++;
        } else {
          await addDoc(collection(firestore!, 'alunos'), studentData);
          created++;
        }
      }
      toast({ title: "Sincronização Concluída!", description: `${created} novos, ${updated} atualizados.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha na sincronização", description: e.message });
    } finally {
      setIsSyncingSiga(false);
    }
  };

  const saveVisualSettings = () => {
    if (!firestore) return;
    
    const payload = Object.fromEntries(
      Object.entries({
        logoUrl: logoBase64,
        logoHeight,
        logoFichaUrl: logoFichaBase64,
        logoFichaHeight,
        sigaUrl,
        sigaToken,
        sigaUsername,
        sigaPassword,
        carometroCardsPerRow,
        carometroBorderRadius,
        carometroCardScale,
        carometroGap,
        carometroShadowIntensity,
        carometroFontSize,
        carometroBadgeBorderRadius,
        carometroButtonBorderRadius,
        activeTrimesterId
      }).filter(([_, v]) => v !== undefined)
    );

    setDocumentNonBlocking(doc(firestore, 'configuracoes', 'geral'), payload, { merge: true });
    toast({ title: "Configurações salvas!" });
  };

  const handleEditSegment = (seg: SchoolSegment) => {
    setEditingSegment(seg);
    setIsEditSegDialogOpen(true);
  };

  const handleEditClass = (cls: SchoolClass) => {
    setEditingClass(cls);
    setIsEditClassDialogOpen(true);
  };

  const onUpdateSegment = () => {
    if (!editingSegment || !firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'segmentos', editingSegment.id), {
      nome: editingSegment.nome,
      ordem: editingSegment.ordem,
      fichaLayoutId: editingSegment.fichaLayoutId || null
    });
    setIsEditSegDialogOpen(false);
    toast({ title: "Segmento atualizado!" });
  };

  const onUpdateClass = () => {
    if (!editingClass || !firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'turmas', editingClass.id), {
      nome: editingClass.nome,
      ordem: editingClass.ordem,
      segmentoId: editingClass.segmentoId,
      professores: editingClass.professores || [],
      fichaLayoutId: editingClass.fichaLayoutId || null
    });
    setNewProfessorName("");
    setIsEditClassDialogOpen(false);
    toast({ title: "Turma atualizada!" });
  };

  return (
    <div className="min-h-screen bg-transparent print-mode-badge">
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-primary flex items-center gap-2"><Database className="h-8 w-8" /> Gestão Administrativa</h2>
              <p className="text-muted-foreground">Controle central de alunos e integração SIGA.</p>
            </div>
            <Button onClick={handlePullSigaSync} disabled={isSyncingSiga} className="gap-2 shadow-lg bg-green-600 hover:bg-green-700">
              {isSyncingSiga ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
              Sincronizar com SIGA
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-12 mb-8 shadow-sm">
              <TabsTrigger value="alunos" className="gap-2"><Users size={16} /> Alunos</TabsTrigger>
              <TabsTrigger value="estrutura" className="gap-2"><School size={16} /> Estrutura</TabsTrigger>
              <TabsTrigger value="fichas" className="gap-2"><Layout size={16} /> Fichas</TabsTrigger>
              <TabsTrigger value="importacao" className="gap-2"><ArrowRightLeft size={16} /> Importação</TabsTrigger>
              <TabsTrigger value="sistema" className="gap-2"><Settings size={16} /> Sistema</TabsTrigger>
            </TabsList>

            <TabsContent value="alunos" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Coluna Esquerda: Adicionar + Filtros */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <AddStudentCard onAddStudent={(s) => addDocumentNonBlocking(alunosCollection!, { ...s, enabled: true, visivelFila: true, ativo: true })} models={models} students={allStudents} segments={schoolSegments} classes={schoolClasses} />

                  {/* Info do usuário logado */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-3 border-b bg-primary/5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-black">{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">{user?.displayName || user?.email?.split('@')[0] || 'Usuário'}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Filtros rápidos */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-bold flex items-center gap-2"><ListFilter size={14} className="text-primary" /> Filtros</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-4 pb-4">
                      <Select value={filterSegmentoId || 'all'} onValueChange={(v) => { setFilterSegmentoId(v === 'all' ? null : v); setFilterTurma(null); }}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Todos os Segmentos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Segmentos</SelectItem>
                          {schoolSegments.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterTurma || 'all'} onValueChange={(v) => setFilterTurma(v === 'all' ? null : v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Todas as Turmas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Turmas</SelectItem>
                          {schoolClasses.filter(c => !filterSegmentoId || c.segmentoId === filterSegmentoId).map(t => <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button variant={showTransferred ? 'default' : 'outline'} size="sm" className="flex-1 h-8 text-[10px] gap-1" onClick={() => setShowTransferred(!showTransferred)}>
                          <Archive size={12} /> {showTransferred ? 'Arquivados' : 'Ativos'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-[10px]" onClick={() => { setFilterSegmentoId(null); setFilterTurma(null); setSearchTerm(''); }}>
                          Limpar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Ações em Lote */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden mt-2">
                    <div className="p-4 space-y-4">
                      {/* Grupo 1: Para todos filtrados */}
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold" onClick={() => handleBulkToggleEnabled(true)}>
                          <CheckSquare size={14} className="text-primary" /> SELECIONAR TODOS P/ IMPRESSÃO
                        </Button>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold" onClick={() => handleBulkToggleEnabled(false)}>
                          <Square size={14} className="text-muted-foreground" /> DESELECIONAR TODOS P/ IMPRESSÃO
                        </Button>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold" onClick={() => handleBulkToggleVisibilidade(true)}>
                          <Eye size={14} className="text-primary" /> HABILITAR TODOS NA FILA
                        </Button>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold" onClick={() => handleBulkToggleVisibilidade(false)}>
                          <EyeOff size={14} className="text-muted-foreground" /> OCULTAR TODOS DA FILA
                        </Button>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => handleBulkToggleAtivo(false)}>
                          <UserMinus size={14} /> TRANSFERIR TODOS FILTRADOS
                        </Button>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleBulkToggleAtivo(true)}>
                          <UserCheck size={14} /> REATIVAR TODOS FILTRADOS
                        </Button>
                      </div>

                      {/* Grupo 2: Para selecionados */}
                      <div className="space-y-2 pt-4 border-t">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                          PARA SELECIONADOS ({selectedInFilter.length})
                        </span>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold" onClick={() => handleBulkToggleVisibilidade(true, true)}>
                          <Eye size={14} className="text-primary" /> MOSTRAR SELECIONADOS NA FILA
                        </Button>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold" onClick={() => handleBulkToggleVisibilidade(false, true)}>
                          <EyeOff size={14} className="text-muted-foreground" /> OCULTAR SELECIONADOS DA FILA
                        </Button>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => handleBulkToggleAtivo(false, true)}>
                          <UserMinus size={14} /> TRANSFERIR SELECIONADOS
                        </Button>
                        <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-3 text-xs font-semibold text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleBulkToggleAtivo(true, true)}>
                          <UserCheck size={14} /> REATIVAR SELECIONADOS
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coluna Principal: Lista + Migração */}
                <div className="lg:col-span-3 flex flex-col gap-4">

                  {/* Migrar Turma */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
                      <span className="text-sm font-black text-primary flex items-center gap-2"><ArrowRightLeft size={14} /> Migrar Turma em Bloco</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Move todos de uma turma para outra</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Turma Origem</Label>
                        <Select value={migrationSourceTurma || 'none'} onValueChange={v => setMigrationSourceTurma(v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Origem..." /></SelectTrigger>
                          <SelectContent>{schoolClasses.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Segmento Destino</Label>
                        <Select value={migrationTargetSegmentId || 'UNCHANGED'} onValueChange={v => setMigrationTargetSegmentId(v === 'UNCHANGED' ? '' : v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Segmento..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNCHANGED">Manter igual</SelectItem>
                            {schoolSegments.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Turma Destino</Label>
                        <Select value={migrationTargetTurma || 'UNCHANGED'} onValueChange={v => setMigrationTargetTurma(v === 'UNCHANGED' ? '' : v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Destino..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNCHANGED">Manter igual</SelectItem>
                            {schoolClasses.filter(c => !migrationTargetSegmentId || c.segmentoId === migrationTargetSegmentId).map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="h-9 gap-2 text-xs font-bold" onClick={handleMigrateStudents} disabled={isMigrating || !migrationSourceTurma}>
                        {isMigrating ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />} Mover Alunos
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Alunos */}
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-col gap-3 py-4 border-b px-6">
                      <div className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold text-primary">{showTransferred ? 'Alunos Arquivados' : 'Alunos Ativos'}</CardTitle>
                          <CardDescription className="text-xs font-medium">{filteredStudents.length} registros · {selectedInFilter.length} selecionados p/ impressão</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative w-52">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar..." className="pl-9 h-9 text-xs" value={searchTerm ?? ''} onChange={(e) => setSearchTerm(e.target.value)} />
                          </div>
                          <Button size="sm" className="h-9 gap-2 text-xs bg-primary" onClick={() => router.push(`/fichas/bulk?year=${new Date().getFullYear()}`)}>
                            <Printer size={12} /> Imprimir ({selectedInFilter.length})
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <StudentList students={filteredStudents} models={models} allStudents={allStudents} onUpdate={(s) => updateDocumentNonBlocking(doc(firestore!, 'alunos', s.id), s)} onDelete={(id) => deleteDocumentNonBlocking(doc(firestore!, 'alunos', id))} viewMode="table" segments={schoolSegments} classes={schoolClasses} />
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fichas" className="space-y-6">
              <FichaLayoutManager />
            </TabsContent>

            <TabsContent value="estrutura" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Card de Segmentos */}
                <Card className="shadow-sm border-2">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2"><Layers size={20} className="text-primary" /> Segmentos</CardTitle>
                        <CardDescription className="text-xs">Cadastre e ordene os níveis de ensino.</CardDescription>
                      </div>
                      <Badge variant="outline" className="font-mono">{schoolSegments.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 bg-muted/20 p-2 rounded-lg border">
                      <Input placeholder="Novo Segmento" value={newSegmentName ?? ''} onChange={(e) => setNewSegmentName(e.target.value)} className="bg-background h-10" />
                      <Input type="number" placeholder="Ordem" value={newSegmentOrder ?? 0} onChange={(e) => setNewSegmentOrder(Number(e.target.value))} className="w-20 bg-background h-10" />
                      <Button onClick={() => { if (!newSegmentName) return; addDocumentNonBlocking(collection(firestore!, 'segmentos'), { nome: newSegmentName, ordem: newSegmentOrder }); setNewSegmentName(''); setNewSegmentOrder(p => p + 1); }} className="h-10 px-3"><Plus size={18} /></Button>
                    </div>
                    <ScrollArea className="h-[360px] border rounded-xl overflow-hidden shadow-inner bg-muted/5">
                      <div className="divide-y">
                        {schoolSegments.map(seg => (
                          <div key={seg.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors group">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{seg.ordem}</span>
                              <span className="font-bold text-sm">{seg.nome}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditSegment(seg)}><Pencil size={14} /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'segmentos', seg.id))}><Trash2 size={14} /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Card de Turmas */}
                <Card className="shadow-sm border-2">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2"><School size={20} className="text-primary" /> Turmas</CardTitle>
                        <CardDescription className="text-xs">Cadastre e vincule turmas aos segmentos.</CardDescription>
                      </div>
                      <Badge variant="outline" className="font-mono">{schoolClasses.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-2 bg-muted/20 p-2 rounded-lg border">
                      <Select value={newClassSegmentId || 'none'} onValueChange={v => setNewClassSegmentId(v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar Segmento" /></SelectTrigger>
                        <SelectContent>{schoolSegments.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Input placeholder="Nome da Turma" value={newClassName ?? ''} onChange={(e) => setNewClassName(e.target.value)} className="bg-background h-9" />
                        <Input type="number" placeholder="Ordem" value={newClassOrder ?? 0} onChange={(e) => setNewClassOrder(Number(e.target.value))} className="w-20 bg-background h-9" />
                        <Button onClick={() => { if (!newClassName || !newClassSegmentId) return; addDocumentNonBlocking(collection(firestore!, 'turmas'), { nome: newClassName, segmentoId: newClassSegmentId, ordem: newClassOrder }); setNewClassName(''); setNewClassOrder(p => p + 1); }} className="h-9 px-3" disabled={!newClassName || !newClassSegmentId}><Plus size={16} /></Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Filtrar turmas..." value={classSearch ?? ''} onChange={(e) => setClassSearch(e.target.value)} className="pl-9 h-9 text-xs" />
                      </div>
                      <Select value={classFilterSegmentId} onValueChange={setClassFilterSegmentId}>
                        <SelectTrigger className="h-9 text-xs w-40"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {schoolSegments.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="h-[260px] border rounded-xl overflow-hidden shadow-inner bg-muted/5">
                      <div className="divide-y">
                        {schoolClasses
                          .filter(c => (classFilterSegmentId === 'all' || c.segmentoId === classFilterSegmentId) && (!classSearch || c.nome.toLowerCase().includes(classSearch.toLowerCase())))
                          .map(cls => {
                            const seg = schoolSegments.find(s => s.id === cls.segmentoId);
                            return (
                              <div key={cls.id} className="p-3 flex justify-between items-center hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{cls.ordem}</span>
                                  <div>
                                    <span className="font-bold text-sm">{cls.nome}</span>
                                    {seg && <p className="text-[10px] text-muted-foreground">{seg.nome}</p>}
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditClass(cls)}><Pencil size={14} /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'turmas', cls.id))}><Trash2 size={14} /></Button>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Migrações */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="shadow-sm border-2 border-orange-200/50">
                  <CardHeader className="pb-4 bg-orange-50/30">
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-700"><ArrowRightLeft size={20} /> Migrar Turma em Bloco</CardTitle>
                    <CardDescription className="text-xs">Move todos os alunos de uma turma para outra, atualizando segmento e turma.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Turma de Origem</Label>
                      <Select value={migrationSourceTurma || 'none'} onValueChange={v => setMigrationSourceTurma(v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a turma de origem..." /></SelectTrigger>
                        <SelectContent>{schoolClasses.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Segmento Destino</Label>
                        <Select value={migrationTargetSegmentId || 'UNCHANGED'} onValueChange={v => setMigrationTargetSegmentId(v === 'UNCHANGED' ? '' : v)}>
                          <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Manter igual" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNCHANGED">Manter segmento</SelectItem>
                            {schoolSegments.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Turma Destino</Label>
                        <Select value={migrationTargetTurma || 'UNCHANGED'} onValueChange={v => setMigrationTargetTurma(v === 'UNCHANGED' ? '' : v)}>
                          <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Manter igual" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNCHANGED">Manter turma</SelectItem>
                            {schoolClasses.filter(c => !migrationTargetSegmentId || c.segmentoId === migrationTargetSegmentId).map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="w-full h-10 gap-2 font-bold bg-orange-600 hover:bg-orange-700" onClick={handleMigrateStudents} disabled={isMigrating || !migrationSourceTurma}>
                      {isMigrating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />} Mover Alunos da Turma
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-2 border-purple-200/50">
                  <CardHeader className="pb-4 bg-purple-50/30">
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-700"><Layers size={20} /> Migrar Segmento Completo</CardTitle>
                    <CardDescription className="text-xs">Atualiza o segmento de todos os alunos de um segmento para outro.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Segmento de Origem</Label>
                      <Select value={migrationSourceSegName || 'none'} onValueChange={v => setMigrationSourceSegName(v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o segmento de origem..." /></SelectTrigger>
                        <SelectContent>{schoolSegments.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Segmento de Destino</Label>
                      <Select value={migrationTargetSegId || 'none'} onValueChange={v => setMigrationTargetSegId(v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o segmento de destino..." /></SelectTrigger>
                        <SelectContent>{schoolSegments.filter(s => s.nome !== migrationSourceSegName).map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full h-10 gap-2 font-bold bg-purple-600 hover:bg-purple-700" onClick={handleMigrateSegment} disabled={isMigratingSeg || !migrationSourceSegName || !migrationTargetSegId}>
                      {isMigratingSeg ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />} Migrar Segmento Completo
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm border-2 border-blue-200/50">
                <CardHeader className="pb-4 bg-blue-50/30">
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-700"><UserCheck size={20} /> Migrar Alunos Selecionados</CardTitle>
                  <CardDescription className="text-xs">
                    Move apenas os alunos marcados (✔) na aba Alunos para uma turma/segmento destino.
                    <strong className="ml-1 text-blue-700">{selectedInFilter.length} aluno(s) selecionado(s) no momento.</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Segmento Destino</Label>
                      <Select value={targetSelectedSegmentId || 'none'} onValueChange={v => setTargetSelectedSegmentId(v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Segmento..." /></SelectTrigger>
                        <SelectContent>{schoolSegments.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Turma Destino</Label>
                      <Select value={targetSelectedTurmaName || 'none'} onValueChange={v => setTargetSelectedTurmaName(v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Turma..." /></SelectTrigger>
                        <SelectContent>{schoolClasses.filter(c => !targetSelectedSegmentId || c.segmentoId === targetSelectedSegmentId).map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="h-10 gap-2 font-bold bg-blue-600 hover:bg-blue-700" onClick={handleBulkMigrateSelected} disabled={isMigratingSelected || selectedInFilter.length === 0 || !targetSelectedSegmentId || !targetSelectedTurmaName}>
                      {isMigratingSelected ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Mover {selectedInFilter.length} Selecionado(s)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="importacao" className="space-y-8">
              <Tabs defaultValue="excel" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-10 mb-6">
                  <TabsTrigger value="excel" className="gap-2">Excel e Fotos</TabsTrigger>
                  <TabsTrigger value="manual-json" className="gap-2 text-primary font-bold"><FileJson size={16} /> Activesoft (JSON Manual)</TabsTrigger>
                </TabsList>

                <TabsContent value="excel">
                  <BulkImportCard onImport={(newOnes) => newOnes.forEach(s => addDocumentNonBlocking(alunosCollection!, { ...s, enabled: true, visivelFila: true, ativo: true }))} models={models} />
                </TabsContent>

                <TabsContent value="manual-json">
                  <div className="max-w-5xl mx-auto space-y-6">
                    {previewImportList.length === 0 ? (
                      <>
                        <Alert className="bg-primary/5 border-primary/20">
                          <FileJson className="h-4 w-4 text-primary" />
                          <AlertTitle className="text-primary font-bold">Conversor Inteligente Activesoft</AlertTitle>
                          <AlertDescription className="text-xs text-muted-foreground">
                            Cole os blocos de código JSON abaixo. O sistema fará o cruzamento dos IDs e mostrará uma prévia antes de importar.
                          </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">1. Lista de Alunos (results)</Label>
                            <Textarea placeholder='[{"id": 5620, "nome": "Kauê...", "matricula": "20240425"...}, ...]' className="h-48 font-mono text-[10px]" value={jsonAlunos ?? ""} onChange={(e) => setJsonAlunos(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">2. Lista de Fotos (s3)</Label>
                            <Textarea placeholder='[{"id": 5620, "s3": "https://..."}, ...]' className="h-48 font-mono text-[10px]" value={jsonFotos ?? ""} onChange={(e) => setJsonFotos(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">3. Lista de Turmas (oficial)</Label>
                            <Textarea placeholder='[{"id": 5620, "turma_oficial": "EM / 3º Ano..."}, ...]' className="h-48 font-mono text-[10px]" value={jsonTurmas ?? ""} onChange={(e) => setJsonTurmas(e.target.value)} />
                          </div>
                        </div>
                        <Button className="w-full h-12 text-lg font-bold gap-2 shadow-lg" onClick={handleAnalyzeManualJson} disabled={!jsonAlunos}><Search /> Analisar e Ver Prévia</Button>
                      </>
                    ) : (
                      <Card className="border-primary shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader className="bg-primary/5 flex flex-row items-center justify-between border-b py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary text-white p-2 rounded-lg"><Users size={20} /></div>
                            <div>
                              <CardTitle className="text-lg">Revisar Importação</CardTitle>
                              <CardDescription className="text-[10px] font-bold uppercase">{selectedIndices.size} de {previewImportList.length} selecionados</CardDescription>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setPreviewImportList([])} className="text-destructive h-8 gap-1 font-bold text-[10px] uppercase"><XCircle size={14} /> Cancelar</Button>
                        </CardHeader>
                        <div className="p-4 bg-muted/20 border-b flex flex-col sm:flex-row gap-4 justify-between items-center">
                          <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Filtrar prévia..." className="pl-9 h-9 text-xs" value={previewSearchTerm ?? ""} onChange={(e) => setPreviewSearchTerm(e.target.value)} /></div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" onClick={() => setSelectedIndices(new Set(previewImportList.map((_, i) => i)))}><CheckSquare size={14} /> Todos</Button>
                            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" onClick={() => setSelectedIndices(new Set())}><Square size={14} /> Nenhum</Button>
                          </div>
                        </div>
                        <ScrollArea className="h-[400px]">
                          <div className="divide-y">
                            {previewImportList.filter(s => !previewSearchTerm || s.nome.toLowerCase().includes(previewSearchTerm.toLowerCase())).map((item, index) => {
                              const originalIndex = previewImportList.indexOf(item);
                              const isSelected = selectedIndices.has(originalIndex);
                              return (
                                <div key={`preview-${originalIndex}`} className={cn("p-3 flex items-center gap-4 hover:bg-muted/30 transition-colors", !isSelected && "opacity-60 grayscale")}>
                                  <Checkbox checked={isSelected} onCheckedChange={(val) => {
                                    const newSet = new Set(selectedIndices);
                                    if (val) newSet.add(originalIndex); else newSet.delete(originalIndex);
                                    setSelectedIndices(newSet);
                                  }} />
                                  <Avatar className="h-10 w-10 border"><AvatarImage src={item.fotoUrl} className="object-cover" /><AvatarFallback><UserCircle /></AvatarFallback></Avatar>
                                  <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{item.nome}</p><p className="text-[9px] text-muted-foreground font-mono">MT: {item.matricula}</p></div>
                                  <div className="text-right shrink-0"><p className="text-[10px] font-bold text-primary">{item.turma}</p><p className="text-[9px] text-muted-foreground uppercase">{item.segmento}</p></div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                        <CardFooter className="bg-primary/5 border-t p-6"><Button className="w-full h-14 text-xl font-bold gap-3 shadow-lg" onClick={handleManualJsonProcess} disabled={isProcessingManual || selectedIndices.size === 0}>{isProcessingManual ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />} Importar {selectedIndices.size} Alunos Agora</Button></CardFooter>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="sistema" className="space-y-8">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* 1. CONFIGURAÇÕES ESCOLARES (TRIMESTRE) */}
                <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <Calendar className="w-5 h-5" /> Ciclo Letivo e Períodos
                    </CardTitle>
                    <CardDescription>Defina o período de avaliação vigente para toda a escola.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Trimestre Ativo (Global)</Label>
                        <Select value={activeTrimesterId} onValueChange={setActiveTrimesterId}>
                          <SelectTrigger className="h-12 text-md font-bold border-2 border-primary/20 bg-white">
                            <SelectValue placeholder="Selecione o trimestre" />
                          </SelectTrigger>
                          <SelectContent className="glass">
                            <SelectItem value="t1" className="font-bold">1º Trimestre</SelectItem>
                            <SelectItem value="t2" className="font-bold">2º Trimestre</SelectItem>
                            <SelectItem value="t3" className="font-bold">3º Trimestre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="h-12 px-8 font-bold gap-2 shadow-lg" onClick={saveVisualSettings}>
                        <Save size={18} /> Salvar Período
                      </Button>
                    </div>
                    <p className="mt-4 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-2">
                      <Info size={14} className="shrink-0" />
                      <span><b>Atenção:</b> Mudar o trimestre aqui altera o período padrão de preenchimento para todos os professores ao abrirem as fichas.</span>
                    </p>
                  </CardContent>
                </Card>

                {/* 2. IDENTIDADE VISUAL */}
                <Card className="border-primary/20 shadow-lg">
                  <CardHeader><div className="flex items-center gap-3"><Palette className="text-primary" /><CardTitle>Identidade Visual (Logo Principal)</CardTitle></div></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="w-64 h-32 bg-muted/30 border rounded-xl flex items-center justify-center p-4">
                        {logoBase64 ? <img src={logoBase64} alt="Logo" className="max-w-full object-contain" style={{ height: `${logoHeight}px` }} /> : <Globe className="text-muted-foreground/20" />}
                      </div>
                      <div className="flex-1 w-full space-y-4">
                        <Input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setLogoBase64(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }} />
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold"><span>Altura do Logo</span><span>{logoHeight}px</span></div>
                          <Slider value={[logoHeight]} onValueChange={(val) => setLogoHeight(val[0])} min={20} max={100} step={1} />
                        </div>
                        <Button className="w-full font-bold h-11" onClick={saveVisualSettings}>Salvar Logo Principal</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. ESTÚDIO DE LAYOUT DO CARÔMETRO */}
                <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <Layout className="w-5 h-5" /> Estúdio de Layout do Carômetro
                    </CardTitle>
                    <CardDescription>Personalize a aparência dos cartões de alunos em tempo real.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
                      {/* Lado Esquerdo: Preview */}
                      <div className="bg-muted/30 p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground mb-6 tracking-widest">Visualização do Cartão</span>
                        
                        <div 
                          className="bg-card overflow-hidden border-none transition-all duration-300 mx-auto"
                          style={{ 
                            borderRadius: `${carometroBorderRadius}px`,
                            transform: `scale(${carometroCardScale / 100})`,
                            boxShadow: `0 10px 30px rgba(0,0,0,${carometroShadowIntensity})`,
                            width: '160px'
                          }}
                        >
                          <div className="aspect-[3/4] relative bg-muted/50 overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                              <UserCircle size={64} className="text-primary/20" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end justify-center p-2">
                               <div 
                                 className="h-5 w-full bg-white/20 backdrop-blur-md text-[8px] flex items-center justify-center text-white font-bold uppercase tracking-wider"
                                 style={{ borderRadius: `${carometroButtonBorderRadius}px` }}
                               >
                                 Preencher Ficha
                               </div>
                            </div>
                          </div>
                          <div className="p-3 text-center bg-card flex flex-col gap-1 min-h-[60px] justify-center border-t">
                            <p className="font-black uppercase tracking-tight leading-tight" style={{ fontSize: `${carometroFontSize}px` }}>Aluno Exemplo</p>
                            <p 
                              className="text-[8px] text-primary/60 font-black uppercase tracking-[0.2em] bg-primary/5 px-2 py-0.5 inline-block mx-auto border border-primary/10"
                              style={{ borderRadius: `${carometroBadgeBorderRadius}px` }}
                            >
                              3º ANO A
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Controles */}
                      <div className="p-6 md:p-8 space-y-8 max-h-[600px] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                              <span>Alunos por Linha (PC)</span>
                              <span className="text-primary">{carometroCardsPerRow}</span>
                            </div>
                            <Slider value={[carometroCardsPerRow]} onValueChange={(val) => setCarometroCardsPerRow(val[0])} min={2} max={12} step={1} />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                              <span>Arredondamento</span>
                              <span className="text-primary">{carometroBorderRadius}px</span>
                            </div>
                            <Slider value={[carometroBorderRadius]} onValueChange={(val) => setCarometroBorderRadius(val[0])} min={0} max={40} step={1} />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                              <span>Tamanho/Zoom</span>
                              <span className="text-primary">{carometroCardScale}%</span>
                            </div>
                            <Slider value={[carometroCardScale]} onValueChange={(val) => setCarometroCardScale(val[0])} min={60} max={140} step={1} />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                              <span>Espaçamento</span>
                              <span className="text-primary">{carometroGap}px</span>
                            </div>
                            <Slider value={[carometroGap]} onValueChange={(val) => setCarometroGap(val[0])} min={4} max={32} step={4} />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                              <span>Sombra</span>
                              <span className="text-primary">{(carometroShadowIntensity * 100).toFixed(0)}%</span>
                            </div>
                            <Slider value={[carometroShadowIntensity * 100]} onValueChange={(val) => setCarometroShadowIntensity(val[0] / 100)} min={0} max={25} step={1} />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                              <span>Fonte Nome</span>
                              <span className="text-primary">{carometroFontSize}px</span>
                            </div>
                            <Slider value={[carometroFontSize]} onValueChange={(val) => setCarometroFontSize(val[0])} min={8} max={16} step={1} />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                              <span>Arred. Turma</span>
                              <span className="text-primary">{carometroBadgeBorderRadius}px</span>
                            </div>
                            <Slider value={[carometroBadgeBorderRadius]} onValueChange={(val) => setCarometroBadgeBorderRadius(val[0])} min={0} max={20} step={1} />
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                              <span>Arred. Botão</span>
                              <span className="text-primary">{carometroButtonBorderRadius}px</span>
                            </div>
                            <Slider value={[carometroButtonBorderRadius]} onValueChange={(val) => setCarometroButtonBorderRadius(val[0])} min={0} max={20} step={1} />
                          </div>
                        </div>

                        <Button className="w-full font-bold h-12 text-md shadow-lg" onClick={saveVisualSettings}>
                           <Save size={18} className="mr-2" /> Salvar Layout do Carômetro
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. LOGO DE IMPRESSÃO */}
                <Card className="border-primary/20 shadow-lg">
                  <CardHeader><div className="flex items-center gap-3"><Palette className="text-primary" /><CardTitle>Logo de Impressão (Ficha Individual)</CardTitle></div></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="w-64 h-32 bg-muted/30 border rounded-xl flex items-center justify-center p-4">
                        {logoFichaBase64 ? <img src={logoFichaBase64} alt="Logo Ficha" className="max-w-full object-contain" style={{ height: `${logoFichaHeight}px` }} /> : <Globe className="text-muted-foreground/20" />}
                      </div>
                      <div className="flex-1 w-full space-y-4">
                        <Input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setLogoFichaBase64(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }} />
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold"><span>Altura do Logo</span><span>{logoFichaHeight}px</span></div>
                          <Slider value={[logoFichaHeight]} onValueChange={(val) => setLogoFichaHeight(val[0])} min={20} max={100} step={1} />
                        </div>
                        <Button className="w-full font-bold h-11" onClick={saveVisualSettings}>Salvar Logo de Impressão</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 5. INTEGRAÇÃO SIGA */}
                <Card className="border-primary/20 shadow-lg overflow-hidden">
                  <CardHeader className="bg-primary text-white"><div className="flex items-center gap-3"><RefreshCw size={24} /><CardTitle>Integração SIGA (Activesoft)</CardTitle></div></CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">URL da API</Label><Input placeholder="http://siga03.activesoft.com.br/api/v1/..." value={sigaUrl ?? ""} onChange={(e) => setSigaUrl(e.target.value)} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Usuário</Label><Input value={sigaUsername ?? ""} onChange={(e) => setSigaUsername(e.target.value)} /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Senha</Label><Input type="password" value={sigaPassword ?? ""} onChange={(e) => setSigaPassword(e.target.value)} /></div>
                    </div>
                    <Button variant="outline" className="w-full font-bold h-11 border-primary text-primary" onClick={saveVisualSettings}>Salvar Conexão</Button>
                  </CardContent>
                </Card>

                {/* 6. NOVO ADMINISTRADOR */}
                <Card className="border-primary/20 shadow-lg">
                  <CardHeader><div className="flex items-center gap-3"><UserPlus className="text-primary" /><CardTitle>Novo Administrador</CardTitle></div></CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(async (data) => {
                        setIsRegisteringAdmin(true);
                        try {
                          const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
                          const secondaryAuth = getAuthSecondary(secondaryApp);
                          await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
                          await secondaryAuth.signOut();
                          await deleteApp(secondaryApp);
                          toast({ title: "Admin cadastrado!", description: "Sua sessão atual não foi interrompida." }); 
                          registerForm.reset();
                        } catch (e: any) { 
                          toast({ variant: "destructive", title: "Erro no cadastro", description: e.message || "Erro desconhecido." }); 
                        }
                        finally { setIsRegisteringAdmin(false); }
                      })} className="space-y-4">
                        <FormField control={registerForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="admin@escola.com" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={registerForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar</FormLabel><FormControl><Input type="password" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <Button type="submit" className="w-full h-11 font-bold" disabled={isRegisteringAdmin}>{isRegisteringAdmin ? <Loader2 className="animate-spin" /> : "Registrar Admin"}</Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Diálogos de Edição de Estrutura */}
      <Dialog open={isEditSegDialogOpen} onOpenChange={setIsEditSegDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Segmento</DialogTitle></DialogHeader>
          {editingSegment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Segmento</Label>
                <Input value={editingSegment.nome ?? ""} onChange={(e) => setEditingSegment({ ...editingSegment, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ordem de Exibição</Label>
                <Input type="number" value={editingSegment.ordem ?? 0} onChange={(e) => setEditingSegment({ ...editingSegment, ordem: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Modelo de Ficha (Default para o Segmento)</Label>
                <Select value={editingSegment.fichaLayoutId || "none"} onValueChange={(val) => setEditingSegment({ ...editingSegment, fichaLayoutId: val === "none" ? undefined : val })}>
                  <SelectTrigger><SelectValue placeholder="Modelo Padrão..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Usar Geral)</SelectItem>
                    {(layoutsData || []).map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSegDialogOpen(false)}>Cancelar</Button>
            <Button onClick={onUpdateSegment} className="gap-2"><Save size={16} /> Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditClassDialogOpen} onOpenChange={setIsEditClassDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Turma</DialogTitle></DialogHeader>
          {editingClass && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Select value={editingClass.segmentoId ?? ""} onValueChange={(val) => setEditingClass({ ...editingClass, segmentoId: val })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                  <SelectContent>{schoolSegments.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome da Turma</Label>
                <Input value={editingClass.nome ?? ""} onChange={(e) => setEditingClass({ ...editingClass, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ordem de Exibição</Label>
                <Input type="number" value={editingClass.ordem ?? 0} onChange={(e) => setEditingClass({ ...editingClass, ordem: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Modelo de Ficha Específico</Label>
                <Select value={editingClass.fichaLayoutId || "none"} onValueChange={(val) => setEditingClass({ ...editingClass, fichaLayoutId: val === "none" ? undefined : val })}>
                  <SelectTrigger><SelectValue placeholder="Modelo Específico..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Usar do Segmento)</SelectItem>
                    {(layoutsData || []).map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-bold text-primary uppercase">Professores da Turma</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do professor..."
                    value={newProfessorName}
                    onChange={(e) => setNewProfessorName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!newProfessorName.trim()) return;
                        const current = editingClass.professores || [];
                        setEditingClass({ ...editingClass, professores: [...current, newProfessorName.trim()] });
                        setNewProfessorName("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => {
                      if (!newProfessorName.trim()) return;
                      const current = editingClass.professores || [];
                      setEditingClass({ ...editingClass, professores: [...current, newProfessorName.trim()] });
                      setNewProfessorName("");
                    }}
                  >
                    <Plus size={18} />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted/20 rounded-lg border border-dashed">
                  {editingClass.professores && editingClass.professores.length > 0 ? (
                    editingClass.professores.map((p, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                        {p}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            const filtered = editingClass.professores?.filter((_, i) => i !== idx);
                            setEditingClass({ ...editingClass, professores: filtered });
                          }}
                        >
                          <Trash2 size={10} />
                        </Button>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic p-1">Nenhum professor cadastrado</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditClassDialogOpen(false)}>Cancelar</Button>
            <Button onClick={onUpdateClass} className="gap-2"><Save size={16} /> Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
