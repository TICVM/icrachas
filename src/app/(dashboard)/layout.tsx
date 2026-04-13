"use client";

import React, { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/loading-screen";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return <LoadingScreen />;
  }

  // Se não estiver carregando mas não tiver usuário, o useEffect cuidará do redirecionamento
  // Retornamos nulo para evitar que a Sidebar e o conteúdo brilhem brevemente
  if (!user) {
    return null;
  }
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <AppSidebar />
      <main className="flex-1 lg:pl-0 transition-all duration-500 ease-in-out">
        {/* Usamos um padding left apenas no desktop quando a sidebar não estiver colapsada */}
        {/* No entanto, como a sidebar é fixa, precisamos compensar o espaço */}
        <div className="lg:pl-72 transition-all duration-500 ease-in-out group-has-[[data-collapsed=true]]/sidebar:lg:pl-20">
           <div className="min-h-screen relative">
              {/* Background Glows */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
              
              {children}
           </div>
        </div>
      </main>
    </div>
  );
}
