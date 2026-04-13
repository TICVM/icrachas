"use client";

import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2, Users, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Se usuário já estiver logado, redireciona imediatamente
  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace("/");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;

    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O redirecionamento será feito pelo useEffect quando user mudar
    } catch (err: any) {
      const code = err.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("E-mail ou senha inválidos. Verifique suas credenciais.");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else if (code === "auth/network-request-failed") {
        setError("Erro de conexão. Verifique sua internet.");
      } else {
        setError("Ocorreu um erro. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mostra spinner enquanto verifica sessão existente
  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden">
      {/* Painel Esquerdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-slate-800 to-primary/80 flex-col items-center justify-center p-16 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center gap-10">
          {/* Logo/Icon */}
          <div className="relative">
            <div className="w-28 h-28 rounded-[2rem] bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              <Users className="text-white w-14 h-14" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
          </div>

          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Identifica</span>
              <span className="text-4xl font-black text-primary/80 tracking-tighter uppercase leading-none italic">Mais</span>
            </div>
            <p className="text-white/50 font-medium text-lg leading-relaxed max-w-xs">
              Sistema inteligente de gestão escolar e identificação de alunos.
            </p>
          </div>

          {/* Feature badges */}
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {[
              "Gerenciamento de Crachás",
              "Fichas de Avaliação Individual",
              "Portal de Identificação Facial",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 backdrop-blur-sm"
              >
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span className="text-white/70 text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel Direito - Formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-10 animate-in fade-in zoom-in-95 duration-500">
          {/* Header mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Users className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-800 uppercase tracking-tight">IdentificaMais</span>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Bem-vindo de volta</h1>
            <p className="text-slate-500 font-medium">Faça login para acessar o sistema.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-600">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 text-base bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 text-base bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary pr-14 transition-all"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-300">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full h-14 text-base font-black uppercase tracking-wider rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <LogIn className="w-5 h-5" />
                  Entrar no Sistema
                </div>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 font-medium">
            Acesso restrito a usuários autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}
