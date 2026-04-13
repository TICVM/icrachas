'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative py-12 md:py-20 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Sparkles size={14} />
            <span>O Futuro da Identificação Escolar</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-4 md:mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-700">
            Identifique com <br />
            <span className="premium-text-gradient">Inteligência</span>.
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000">
            A solução definitiva para gestão de crachás estudantis. 
            Reconhecimento facial por IA, geração instantânea de PDF e controle administrativo simplificado em uma única plataforma.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <Button 
              size="lg" 
              className="h-12 md:h-14 px-6 md:px-8 font-bold text-base md:text-lg premium-gradient shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all gap-2"
              onClick={() => {
                const portal = document.getElementById('portal-section');
                portal?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Acessar Portal
              <ChevronRight size={18} />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-12 md:h-14 px-6 md:px-8 font-bold text-base md:text-lg border-2 hover:bg-muted/50"
              onClick={() => router.push('/gestao')}
            >
              Painel Adm
            </Button>
          </div>
          
          <div className="mt-12 flex items-center gap-8 grayscale opacity-50 overflow-hidden py-4">
             {/* Stats would go here if needed */}
             <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">100%</span>
                <span className="text-[10px] uppercase tracking-widest font-bold">Digital</span>
             </div>
             <div className="w-px h-8 bg-border" />
             <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">IA</span>
                <span className="text-[10px] uppercase tracking-widest font-bold">Integrada</span>
             </div>
             <div className="w-px h-8 bg-border" />
             <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">PDF</span>
                <span className="text-[10px] uppercase tracking-widest font-bold">Instantâneo</span>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
