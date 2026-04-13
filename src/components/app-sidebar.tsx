"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  UserCircle,
  Menu,
  X,
  CreditCard,
  ScanFace
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { type Student, type SchoolSegment } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import CustomizeCard from "@/components/customize-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const configRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'configuracoes', 'geral') : null, [firestore, user]);
  const { data: configData } = useDoc<any>(configRef);

  const logoUrl = configData?.logoUrl;

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/" },
    { name: "Portal do Aluno", icon: Users, href: "/portal" },
    { name: "Fichas de Avaliação Individual", icon: FileSpreadsheet, href: "/fichas" },
    { name: "Crachás", icon: CreditCard, href: "/gerenciador" },
    { name: "Gestão", icon: ShieldCheck, href: "/gestao", adminOnly: true },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const isActive = (href: string) => {
    if (href === "/" && pathname !== "/") return false;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <div className="min-h-screen bg-transparent print-mode-badge">
        <Button variant="outline" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)} className="bg-background/80 backdrop-blur-md shadow-lg border-primary/20">
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-500 ease-in-out",
          "bg-[#0a0a0c] border-r border-white/5 text-white/70",
          isCollapsed ? "w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header / Logo */}
        <div className="h-20 flex items-center px-6 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
          <div className="flex items-center gap-3 relative z-10 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40 shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Users className="text-white w-5 h-5" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="font-black text-sm uppercase tracking-tighter text-white leading-none">Identifica</span>
                <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Mais</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 mt-6">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              if (item.adminOnly && user?.isAnonymous) return null;
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative",
                    active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-lg shadow-primary" />
                  )}
                  <item.icon className={cn("w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110", active ? "text-primary" : "text-white/40")} />
                  {!isCollapsed && (
                    <span className="text-sm font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">{item.name}</span>
                  )}
                  {active && !isCollapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer / User Profile */}
        <div className="p-4 mt-auto">
          {!isCollapsed && (
            <div className="mb-4 bg-white/5 rounded-2xl p-4 border border-white/5 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-xl">
                  <UserCircle size={24} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-black text-white uppercase truncate">
                    {user?.displayName || user?.email?.split('@')[0] || "Usuário"}
                  </span>
                  <span className="text-[10px] text-white/40 truncate">
                    {user?.isAnonymous ? "Convidado" : "Administrador"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="flex-1 justify-start gap-3 h-12 rounded-xl hover:bg-red-500/10 hover:text-red-400 group"
              >
                <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">Sair do App</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 hidden lg:flex"
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
