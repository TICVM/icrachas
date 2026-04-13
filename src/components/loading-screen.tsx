"use client";

import React from "react";
import { Loader2, Users } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] -z-10 pointer-events-none animate-pulse" />

      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 relative z-10">
            <Users className="text-white w-10 h-10" />
          </div>
          {/* Pulsing ring */}
          <div className="absolute inset-0 w-20 h-20 bg-primary/30 rounded-2xl animate-ping -z-10" />
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-black text-[#1e293b] tracking-tighter uppercase leading-none">Identifica</span>
            <span className="text-2xl font-black text-primary tracking-tighter uppercase leading-none italic">Mais</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest">
            <Loader2 className="w-3 h-3 animate-spin" />
            Validando Acesso
          </div>
        </div>
      </div>
    </div>
  );
}
