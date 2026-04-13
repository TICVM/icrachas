
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Grid3X3, 
  ShieldCheck, 
  ChevronDown,
  UserCog,
  LogOut,
  User,
  Loader2,
  FileSpreadsheet
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { type SystemConfig } from "@/lib/types";

export default function PageHeader() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'configuracoes', 'geral') : null, [firestore]);
  const { data: configData, isLoading: isConfigLoading } = useDoc<SystemConfig>(configRef);

  const fallbackLogoUrl = PlaceHolderImages.find(img => img.id === 'app-logo')?.imageUrl || "";
  const logoUrl = configData?.logoUrl || fallbackLogoUrl;
  const logoHeight = configData?.logoHeight || 48;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="bg-card shadow-sm no-print border-b">
        <div className="container mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-32 h-12 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </header>
    );
  }

  const isAdminActive = pathname.startsWith("/gestao");
  const isUserAdmin = user && !user.isAnonymous;

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <header className="bg-card shadow-sm no-print border-b sticky top-0 z-50 backdrop-blur-md bg-card/80 transition-all duration-300">
      <div className="container mx-auto px-4 py-2 md:py-3 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-4 self-start md:self-auto w-full md:w-auto">
          <Link href="/" className="relative overflow-hidden flex items-center justify-center hover:opacity-80 transition-all group max-w-[60vw]" style={{ height: `${Math.max(32, logoHeight * 0.7)}px` }}>
            {isConfigLoading ? (
              <Loader2 className="animate-spin h-5 w-5 text-primary" />
            ) : (
              <img 
                src={logoUrl} 
                alt="Logo do Sistema" 
                className="max-w-full object-contain transition-transform group-hover:scale-105"
                style={{ height: `${logoHeight * 0.7}px` }}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-text')) {
                    const span = document.createElement('span');
                    span.className = 'fallback-text text-lg font-black premium-text-gradient text-center leading-tight uppercase';
                    span.innerText = 'Identifica\nmais';
                    parent.appendChild(span);
                  }
                }}
              />
            )}
          </Link>
          <div className="hidden sm:flex flex-col gap-0 border-l pl-3 py-0 border-border">
            <h1 className="text-base font-black text-primary tracking-tighter uppercase italic leading-none">Identifica mais</h1>
            <p className="text-muted-foreground text-[7px] font-bold uppercase tracking-[0.2em]">
              Smart Identity Solution
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth">
          <Link href="/" className="flex-shrink-0">
            <Button 
              variant={pathname === "/" ? "default" : "ghost"} 
              size="sm" 
              className={cn("gap-2 h-9 text-xs font-bold rounded-lg", pathname === "/" && "premium-gradient border-none shadow-md shadow-primary/20")}
            >
              <Grid3X3 size={16} />
              Carômetro
            </Button>
          </Link>
          <Link href="/gerenciador" className="flex-shrink-0">
            <Button 
              variant={pathname === "/gerenciador" ? "default" : "ghost"} 
              size="sm" 
              className={cn("gap-2 h-9 text-xs font-bold rounded-lg", pathname === "/gerenciador" && "premium-gradient border-none shadow-md shadow-primary/20")}
            >
              <LayoutDashboard size={16} />
              Crachás
            </Button>
          </Link>
          <Link href="/fichas" className="flex-shrink-0">
            <Button 
              variant={pathname.startsWith("/fichas") ? "default" : "ghost"} 
              size="sm" 
              className={cn("gap-2 h-9 text-xs font-bold rounded-lg", pathname.startsWith("/fichas") && "premium-gradient border-none shadow-md shadow-primary/20")}
            >
              <FileSpreadsheet size={16} />
              Avaliações
            </Button>
          </Link>
          
          <div className="flex-shrink-0 ml-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={isAdminActive ? "default" : "ghost"} 
                  size="sm" 
                  className={cn("gap-2 h-9 text-xs font-bold rounded-lg", isAdminActive && "premium-gradient border-none shadow-md shadow-primary/20")}
                >
                  <ShieldCheck size={16} />
                  Adm
                  <ChevronDown size={14} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 glass animate-in zoom-in-95 duration-200">
                <DropdownMenuLabel className="flex items-center gap-3 px-2 py-3">
                  <div className="premium-gradient p-2 rounded-xl text-white shadow-lg shadow-primary/20">
                    <User size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-tight">Ambiente Seguro</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{isUserAdmin ? user.email : "Acesso restrito"}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10" />
                
                <Link href="/gestao">
                  <DropdownMenuItem className="cursor-pointer gap-3 py-3 rounded-lg focus:bg-primary/5 group">
                    <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <UserCog size={20} className="text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Gestão Escolar</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">Painel Administrativo</span>
                    </div>
                  </DropdownMenuItem>
                </Link>
                
                {isUserAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-primary/10" />
                    <DropdownMenuItem 
                      className="cursor-pointer gap-3 py-3 rounded-lg text-destructive focus:text-destructive focus:bg-destructive/5 group"
                      onClick={handleLogout}
                    >
                      <div className="bg-destructive/10 p-2 rounded-lg group-hover:bg-destructive/20 transition-colors">
                        <LogOut size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Sair</span>
                        <span className="text-[10px] leading-tight">Encerrar sessão</span>
                      </div>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  );
}
