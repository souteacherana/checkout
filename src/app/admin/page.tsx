/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Download, LogOut, CheckCircle, AlertCircle, RefreshCw, Search, Filter, ArrowUpDown, Trash2, TrendingUp, DollarSign, Users, CreditCard, X } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkouts, setCheckouts] = useState<any[]>([]);

  // Filtros e Ordenação
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterUtm, setFilterUtm] = useState<string>('');
  const [filterProduct, setFilterProduct] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const fetchCheckouts = async () => {
    setLoading(true);
    
    // Fetch Asaas checkouts
    const { data: asaasData, error: asaasError } = await supabase
      .from('checkouts')
      .select('*')
      .order('created_at', { ascending: false });
      
    // Fetch Eduzz sales
    const { data: eduzzData, error: eduzzError } = await supabase
      .from('eduzz_sales')
      .select('*')
      .order('created_at', { ascending: false });

    let combined: any[] = [];

    if (!asaasError && asaasData) {
      combined = [...asaasData.map(c => ({ ...c, source: 'Asaas' }))];
    }
    
    if (!eduzzError && eduzzData) {
      const mappedEduzz = eduzzData.map(e => ({
        id: e.id,
        created_at: e.created_at,
        status: (e.status === 'Pago' || e.status === 'Paid' || e.status === 'Aprovado') ? 'PAID' : ((e.status === 'Aguardando Pagamento' || e.status === 'Pix') ? 'PIX_PENDING' : 'PENDING'),
        customer_name: e.client_name,
        customer_email: e.client_email,
        customer_phone: e.client_phone,
        product_name: e.product_name,
        amount: e.value,
        net_value: Number(e.value) * 0.95, // estimativa
        utm_source: 'Eduzz',
        utm_campaign: 'Histórico',
        source: 'Eduzz'
      }));
      combined = [...combined, ...mappedEduzz];
    }
    
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setCheckouts(combined);
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

  const handleDelete = async (id: string, source?: string) => {
    if (!confirm("Tem certeza que deseja excluir esta venda permanentemente? Esta ação não pode ser desfeita.")) return;
    
    // Optimistic UI update
    setCheckouts(prev => prev.filter(c => c.id !== id));
    
    if (source === 'Eduzz') {
       const { error } = await supabase.from('eduzz_sales').delete().eq('id', id);
       if (error) {
         alert("Erro ao excluir venda da Eduzz.");
         fetchCheckouts(); // revert
       }
    } else {
       const { error } = await supabase.from('checkouts').delete().eq('id', id);
       if (error) {
         alert("Erro ao excluir venda.");
         fetchCheckouts(); // revert
       }
    }
  };

  const handleSyncEduzz = async () => {
    try {
      setSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/sync-eduzz', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Sincronização concluída! ${data.count} registros importados da Eduzz.`);
        fetchCheckouts();
      } else {
        alert(`Erro na sincronização: ${data.error || 'Erro desconhecido'}`);
      }
    } catch(e) {
      console.error(e);
      alert("Erro ao conectar com a Eduzz.");
    } finally {
      setSyncing(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/export', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Erro ao exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      a.download = `Vendas_Tier_S_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erro ao exportar CSV. Verifique o console.");
      console.error(e);
    }
  };

  // Processamento dos dados (Filtros e Sort)
  const processedCheckouts = [...checkouts]
    .filter(c => filterStatus === 'ALL' || c.status === filterStatus)
    .filter(c => filterProduct === 'ALL' || c.product_name === filterProduct)
    .filter(c => filterSearch === '' || 
      (c.customer_name?.toLowerCase() || '').includes(filterSearch.toLowerCase()) || 
      (c.customer_email?.toLowerCase() || '').includes(filterSearch.toLowerCase()) ||
      (c.customer_phone?.toLowerCase() || '').includes(filterSearch.toLowerCase())
    )
    .filter(c => filterUtm === '' || 
      (c.utm_source?.toLowerCase() || '').includes(filterUtm.toLowerCase()) || 
      (c.utm_campaign?.toLowerCase() || '').includes(filterUtm.toLowerCase()) ||
      (c.utm_medium?.toLowerCase() || '').includes(filterUtm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name_asc') return (a.customer_name || '').localeCompare(b.customer_name || '');
      if (sortBy === 'name_desc') return (b.customer_name || '').localeCompare(a.customer_name || '');
      if (sortBy === 'utm_asc') return (a.utm_source || '').localeCompare(b.utm_source || '');
      return 0;
    });

  // Métricas Globais (Baseadas nos Filtros)
  const totalPaid = processedCheckouts.filter(c => c.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const liquidPaid = processedCheckouts.filter(c => c.status === 'PAID').reduce((acc, curr) => acc + Number(curr.net_value || (Number(curr.amount || 0) * 0.95)), 0);
  const totalPending = processedCheckouts.filter(c => c.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const countPaid = processedCheckouts.filter(c => c.status === 'PAID').length;
  const countPending = processedCheckouts.filter(c => c.status === 'PENDING').length;
  const countPixPending = processedCheckouts.filter(c => c.status === 'PIX_PENDING').length;

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-500 font-medium">Carregando painel...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      {/* Header Premium */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <TrendingUp size={18} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSyncEduzz} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sincronizando...' : 'Sincronizar Eduzz'}
            </button>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-all hover:shadow-emerald-600/20 hover:-translate-y-0.5">
              <Download size={16} /> Exportar CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Cards de Métricas Modernos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4 hover:border-emerald-200 transition-colors">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-0.5">Total de Vendas</p>
              <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(totalPaid)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-emerald-500/20 p-5 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5 opacity-50"></div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center relative z-10">
              <CreditCard size={24} />
            </div>
            <div className="relative z-10">
              <p className="text-sm text-emerald-700/80 font-medium mb-0.5">Ganho Líquido Real</p>
              <p className="text-2xl font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(liquidPaid)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4 hover:border-orange-200 transition-colors">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-0.5">Em Recuperação</p>
              <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(totalPending)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4 hover:border-indigo-200 transition-colors">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-0.5">Faturas Pagas</p>
              <p className="text-2xl font-bold text-gray-900">{countPaid} <span className="text-sm font-normal text-gray-400">/ {processedCheckouts.length}</span></p>
            </div>
          </div>

        </div>

        {/* Barra de Controles (Filtros e Ordenação) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4 w-full md:w-auto flex-wrap md:flex-nowrap">
              {/* Pesquisa */}
              <div className="relative flex-1 min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar cliente, e-mail ou telefone..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                />
                {filterSearch && (
                  <button onClick={() => setFilterSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* UTM */}
              <div className="relative w-full md:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Filtrar por UTM..."
                  value={filterUtm}
                  onChange={(e) => setFilterUtm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                />
              </div>

              {/* Produto */}
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="w-full md:w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-700 bg-white"
              >
                <option value="ALL">Todos os Produtos</option>
                {Array.from(new Set(checkouts.map(c => c.product_name))).filter(Boolean).map(p => (
                  <option key={String(p)} value={String(p)}>{String(p)}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full md:w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-700 bg-white"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PAID">Pagas</option>
                <option value="PIX_PENDING">Aguardando Pix</option>
                <option value="PENDING">Abandonos</option>
              </select>
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <ArrowUpDown size={16} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-700 bg-gray-50"
              >
                <option value="date_desc">Data (Mais recentes)</option>
                <option value="date_asc">Data (Mais antigas)</option>
                <option value="name_asc">Nome (A - Z)</option>
                <option value="name_desc">Nome (Z - A)</option>
                <option value="utm_asc">Agrupar por UTM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Vendas Premium */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-[#f8fafc] border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Data e Hora</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4">Origem (UTM)</th>
                  <th className="px-6 py-4 text-right">Ganho</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedCheckouts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900 font-medium">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span> <br/>
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleTimeString('pt-BR')}</span>
                    </td>
                    <td className="px-6 py-4">
                      {c.status === 'PAID' && <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold"><CheckCircle size={14}/> Paga</span>}
                      {c.status === 'PENDING' && <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-md text-xs font-semibold"><AlertCircle size={14}/> Abandono</span>}
                      {c.status === 'PIX_PENDING' && <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold"><RefreshCw size={14} className={c.status === 'PIX_PENDING' ? 'animate-spin-slow' : ''}/> Pix Aguard.</span>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{c.customer_name || "Sem Nome"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.customer_email || "S/ E-mail"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.customer_phone}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-700">
                      {c.product_name}
                    </td>
                    <td className="px-6 py-4">
                      {c.utm_source ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{c.utm_source}</span>
                          {c.utm_campaign && <span className="text-[10px] text-gray-400 uppercase tracking-wider">{c.utm_campaign}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                      {c.source === 'Eduzz' && (
                         <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-wider">Via Eduzz</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(c.amount || 0)}
                      {c.net_value && <div className="text-[10px] text-emerald-600 font-normal mt-1">Líquido: {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(c.net_value)}</div>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDelete(c.id, c.source)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Excluir Venda"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {processedCheckouts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search size={32} className="text-gray-300 mb-2" />
                        <p className="font-medium text-gray-900">Nenhum registro encontrado</p>
                        <p className="text-sm">Tente limpar os filtros para ver mais resultados.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 text-sm text-gray-500 flex justify-between items-center">
            <span>Mostrando <b>{processedCheckouts.length}</b> resultados</span>
          </div>
        </div>

      </main>
    </div>
  );
}
