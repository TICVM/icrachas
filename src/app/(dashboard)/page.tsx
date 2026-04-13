"use client";

import React, { useMemo } from "react";
import { 
  Users, 
  FileSpreadsheet, 
  CreditCard, 
  ShieldCheck, 
  ArrowRight,
  UserPlus,
  Printer,
  Calendar,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { type Student, type SchoolSegment } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const alunosRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'alunos') : null, [firestore, user]);
  const { data: students } = useCollection<Student>(alunosRef);

  const segmentosRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'segmentos'), orderBy('ordem', 'asc')) : null, [firestore, user]);
  const { data: segments } = useCollection<SchoolSegment>(segmentosRef);

  const stats = [
    { label: "Total de Alunos", value: students?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Segmentos", value: segments?.length || 0, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Fichas Pendentes", value: "8", icon: FileSpreadsheet, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Turmas Ativas", value: "12", icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const quickActions = [
    {
      title: "Portal do Aluno",
      description: "Carômetro, busca rápida e identificação facial.",
      icon: Users,
      href: "/portal",
      color: "from-blue-600 to-indigo-600",
      stats: `${students?.length || 0} alunos ativos`
    },
    {
      title: "Fichas de Avaliação Individual",
      description: "Preenchimento de fichas e relatórios pedagógicos.",
      icon: FileSpreadsheet,
      href: "/fichas",
      color: "from-emerald-500 to-teal-600",
      stats: "3 períodos disponíveis"
    },
    {
      title: "Identidade Visual",
      description: "Geração de crachás e etiquetas escolares.",
      icon: CreditCard,
      href: "/gerenciador",
      color: "from-purple-600 to-pink-600",
      stats: "Formato A4 PDF"
    },
    {
      title: "Gestão do Sistema",
      description: "Configurações, usuários e integração SIGA.",
      icon: ShieldCheck,
      href: "/gestao",
      color: "from-slate-700 to-slate-900",
      stats: "Acesso administrativo"
    }
  ];

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="border-primary/30 text-primary px-3 py-1 font-black tracking-widest uppercase text-[10px]">Visão Geral do Sistema</Badge>
          <h1 className="text-4xl md:text-5xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">
            Dashboard <span className="text-primary italic">Central</span>
          </h1>
          <p className="text-muted-foreground font-medium text-lg">Bem-vindo, selecione a área de trabalho para iniciar.</p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={() => router.push('/gestao')} variant="outline" className="h-12 px-6 font-bold rounded-xl gap-2 border-primary/20 hover:bg-primary/5 group">
             <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
             Novo Aluno
          </Button>
          <Button onClick={() => router.push('/gerenciador')} className="h-12 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl bg-primary shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
             <Printer size={18} className="mr-2" /> Imprimir Crachás
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-xl shadow-primary/5 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:rotate-6", stat.bg)}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</span>
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 pl-2">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {quickActions.map((action, i) => (
            <Card 
              key={i} 
              className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:-translate-y-2 transition-all duration-500"
              onClick={() => router.push(action.href)}
            >
              <CardContent className="p-0 flex flex-col h-full">
                <div className={cn("h-40 flex items-center justify-center relative overflow-hidden bg-gradient-to-br", action.color)}>
                   <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                   <action.icon size={64} className="text-white relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
                   
                   <div className="absolute bottom-4 left-4">
                      <Badge className="bg-white/20 backdrop-blur-md text-white border-none font-bold text-[8px] uppercase tracking-widest">{action.stats}</Badge>
                   </div>
                </div>
                <div className="p-8 space-y-3 bg-white flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{action.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">{action.description}</p>
                  
                  <div className="pt-4 mt-auto">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest group-hover:gap-4 transition-all">
                      Acessar Módulo <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <Card className="border-none bg-[#1e293b] text-white rounded-3xl overflow-hidden mt-12">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-xl font-black uppercase tracking-tight">Suporte ao Sistema</h4>
            <p className="text-slate-400 text-sm">Problemas com biometria ou sincronização? Nossa equipe está online.</p>
          </div>
          <Button variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold h-12 px-8 rounded-xl">
             Abrir Chamado Técnico
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
