'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScanFace, Printer, ShieldCheck, Users } from 'lucide-react';

const features = [
  {
    title: "Busca Facial IA",
    description: "Encontre alunos rapidamente usando algoritmos avançados de reconhecimento facial integrados ao Genkit AI.",
    icon: ScanFace,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Impressão em Lote",
    description: "Gere centenas de crachás e fichas de avaliação em PDF perfeitamente formatados para A4 em segundos.",
    icon: Printer,
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    title: "Gestão Segura",
    description: "Controle total sobre turmas, segmentos e dados de alunos com autenticação em tempo real.",
    icon: ShieldCheck,
    color: "bg-indigo-500/10 text-indigo-500",
  },
  {
    title: "Portal do Aluno",
    description: "Visualização clara e intuitiva para carômetros escolares e consulta rápida de registros acadêmicos.",
    icon: Users,
    color: "bg-pink-500/10 text-pink-500",
  }
];

export default function FeatureCards() {
  return (
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tighter">
            Funcionalidades de <span className="text-primary tracking-normal">Elite</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Desenvolvido para escolas que buscam eficiência máxima e design impecável na identificação de seus estudantes.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="card-hover border-none bg-card/60 backdrop-blur-sm shadow-xl shadow-black/5">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon size={24} />
                </div>
                <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
