/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Download, LogOut, FileText, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkouts, setCheckouts] = useState<any[]>([]);

  const fetchCheckouts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('checkouts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setCheckouts(data);
    }
    setLoading(false);
  };

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/admin/login");
    } else {
      fetchCheckouts();
    }
  };

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const exportToCSV = () => {
    const headers = ["Criação", "ID", "Status", "Cliente", "E-mail", "Telefone", "Produto", "UTM Source", "UTM Campaign", "Ganho"];
    const rows = checkouts.map(c => [
      new Date(c.created_at).toLocaleString('pt-BR'),
      c.id,
      c.status,
      c.customer_name || "-",
      c.customer_email || "-",
      c.customer_phone || "-",
      c.product_name || "-",
      c.utm_source || "-",
      c.utm_campaign || "-",
      c.amount || "0"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `checkouts_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Métricas
  const totalPaid = checkouts.filter(c => c.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const liquidPaid = totalPaid * 0.95; // Simulação de ganho líquido (tirando 5% taxa Asaas)
  const totalPending = checkouts.filter(c => c.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  
  const countPaid = checkouts.filter(c => c.status === 'PAID').length;
  const countPending = checkouts.filter(c => c.status === 'PENDING').length;
  const countPixPending = checkouts.filter(c => c.status === 'PIX_PENDING').length;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-[#f3f4f6] pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Eduzz Dashboard Copy</h1>
          <div className="flex gap-3">
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700">
              <Download size={16} /> Exportar CSV
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Métricas Principais (Padrão Eduzz) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 border-b pb-2">Receitas totais brutas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total de vendas</p>
              <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(totalPaid)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Ganho líquido (aprox.)</p>
              <p className="text-2xl font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(liquidPaid)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Reembolsos</p>
              <p className="text-2xl font-bold text-gray-900">R$ 0,00</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total em recuperação (Abandonos)</p>
              <p className="text-2xl font-bold text-orange-500">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(totalPending)}</p>
            </div>
          </div>
        </div>

        {/* Faturas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 border-b pb-2">Faturas totais</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{checkouts.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Pagas</p>
              <p className="text-2xl font-bold text-emerald-600">{countPaid}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Abertas (Pix)</p>
              <p className="text-2xl font-bold text-blue-600">{countPixPending}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Em recuperação</p>
              <p className="text-2xl font-bold text-orange-500">{countPending}</p>
            </div>
          </div>
        </div>

        {/* Tabela de Vendas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-4 py-4">Criação</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Cliente</th>
                  <th className="px-4 py-4">Produto</th>
                  <th className="px-4 py-4">UTM Source</th>
                  <th className="px-4 py-4 text-right">Ganho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checkouts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('pt-BR')} <br/>
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleTimeString('pt-BR')}</span>
                    </td>
                    <td className="px-4 py-4">
                      {c.status === 'PAID' && <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold"><CheckCircle size={12}/> Paga</span>}
                      {c.status === 'PENDING' && <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold"><AlertCircle size={12}/> Abandono</span>}
                      {c.status === 'PIX_PENDING' && <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold"><RefreshCw size={12}/> Pix Aguardando</span>}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{c.customer_name || "Sem Nome"}</p>
                      <p className="text-xs text-gray-500">{c.customer_email || "S/ E-mail"}</p>
                      <p className="text-xs text-gray-400">{c.customer_phone}</p>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {c.product_name}
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-500">
                      {c.utm_source || "-"} <br/>
                      {c.utm_campaign && `[${c.utm_campaign}]`}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(c.amount || 0)}
                    </td>
                  </tr>
                ))}
                {checkouts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nenhum registro encontrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
