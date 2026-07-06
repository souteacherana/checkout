"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Store, LogOut, Users, Package, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserRole } from "./actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("VIEWER");
  const [products, setProducts] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        getUserRole(session.user.email).then(role => setUserRole(role));
        supabase.from('products').select('slug, title').order('title').then(({ data }) => {
          if (data) setProducts(data);
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // Se for a tela de login, não mostra a sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const isSuperAdmin = userRole === "SUPERADMIN";

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-30 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="font-bold text-lg text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-white text-xs">
              <Store size={14} />
            </span>
            RiseAdmin
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link 
            href="/admin" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/admin' 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          {products.length > 0 && (
            <div className="pt-3">
              <p className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produtos</p>
              {products.map(p => (
                <Link
                  key={p.slug}
                  href={`/admin/${p.slug}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === `/admin/${p.slug}`
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Package size={16} />
                  <span className="truncate">{p.title}</span>
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/admin/produtos"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname?.startsWith('/admin/produtos')
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Store size={18} />
            Produtos
          </Link>

          <Link
            href="/admin/recuperacao"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname?.startsWith('/admin/recuperacao')
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <RotateCcw size={18} />
            Recuperação
          </Link>

          {isSuperAdmin && (
            <Link 
              href="/admin/equipe" 
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname?.startsWith('/admin/equipe')
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Users size={18} />
              Equipe
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="px-3 py-2 mb-2 text-xs text-gray-500 font-medium truncate">
            {userEmail || "Carregando..."}
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
