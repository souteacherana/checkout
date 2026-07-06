/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "../actions";
import {
  Package, Plus, Edit2, Trash2, ExternalLink, LinkIcon,
  TrendingUp, CheckCircle, X
} from "lucide-react";

const CHECKOUT_BASE_URL = "https://checkout.riseeducacao.com.br";

type Product = {
  id?: string;
  slug: string;
  title: string;
  price: string | number;
  accent_color: string | null;
  accent_color_hover: string | null;
  image_src: string | null;
  fb_pixel_id: string | null;
  fb_capi_token: string | null;
};

const emptyProduct: Product = {
  slug: "", title: "", price: "", accent_color: "#10b981", accent_color_hover: "#059669",
  image_src: "", fb_pixel_id: "", fb_capi_token: ""
};

type ProductStats = { produto_slug: string | null; vendas: number; receita: number };

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ProdutosPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [statsRows, setStatsRows] = useState<ProductStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchAll = async () => {
    // Stats agregadas no Postgres (RPC sobre a view vendas) — o navegador
    // recebe números prontos, não a base inteira.
    const [{ data: prods }, { data: st }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.rpc("vendas_stats_por_produto"),
    ]);
    setProducts(prods || []);
    setStatsRows(st || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
        return;
      }
      if (session.user?.email) {
        getUserRole(session.user.email).then(role =>
          setIsAdmin(role === "ADMIN" || role === "SUPERADMIN")
        );
      }
      fetchAll();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vendas pagas e receita por produto — direto da RPC
  const stats = useMemo(() => {
    const map = new Map<string, { paid: number; revenue: number }>();
    for (const s of statsRows) {
      if (s.produto_slug) map.set(s.produto_slug, { paid: Number(s.vendas), revenue: Number(s.receita) });
    }
    return map;
  }, [statsRows]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);

    const payload = {
      slug: editing.slug.toLowerCase(),
      title: editing.title,
      price: Number(editing.price),
      accent_color: editing.accent_color,
      accent_color_hover: editing.accent_color_hover,
      image_src: editing.image_src,
      fb_pixel_id: editing.fb_pixel_id || null,
      fb_capi_token: editing.fb_capi_token || null,
    };

    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert([payload]);

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setEditing(null);
      fetchAll();
    }
    setSaving(false);
  };

  const handleDelete = async (p: Product) => {
    if (!p.id) return;
    if (!confirm(`Excluir "${p.title}"? A página de checkout /${p.slug} deixará de existir.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) alert("Erro ao excluir: " + error.message);
    fetchAll();
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${CHECKOUT_BASE_URL}/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-500 font-medium">Carregando produtos...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <Package size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Produtos</h1>
              <p className="text-xs text-gray-400 -mt-0.5">Painéis, páginas de checkout e desempenho</p>
            </div>
          </div>
          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(emptyProduct)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-all"
            >
              <Plus size={16} /> Novo Produto
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* Formulário de Criação/Edição */}
        {editing && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8 shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-gray-900">{editing.id ? `Editar ${editing.title}` : "Criar Novo Produto"}</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título do Produto</label>
                <input required type="text" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Ex: Teacher ADS" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">URL (Slug)</label>
                <input required type="text" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Ex: tft" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (R$)</label>
                <input required type="number" step="0.01" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="49.90" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">URL do Banner Principal</label>
                <input type="text" value={editing.image_src || ""} onChange={e => setEditing({ ...editing, image_src: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cor Principal (HEX)</label>
                <div className="flex gap-2">
                  <input type="color" value={editing.accent_color || "#10b981"} onChange={e => setEditing({ ...editing, accent_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                  <input type="text" value={editing.accent_color || ""} onChange={e => setEditing({ ...editing, accent_color: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="#10b981" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cor ao Passar o Mouse (Hover)</label>
                <div className="flex gap-2">
                  <input type="color" value={editing.accent_color_hover || "#059669"} onChange={e => setEditing({ ...editing, accent_color_hover: e.target.value })} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                  <input type="text" value={editing.accent_color_hover || ""} onChange={e => setEditing({ ...editing, accent_color_hover: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="#059669" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Facebook Pixel ID <span className="font-normal text-gray-400">(opcional)</span></label>
                <input type="text" value={editing.fb_pixel_id || ""} onChange={e => setEditing({ ...editing, fb_pixel_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="1084815..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Token CAPI <span className="font-normal text-gray-400">(opcional)</span></label>
                <input type="password" value={editing.fb_capi_token || ""} onChange={e => setEditing({ ...editing, fb_capi_token: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="EAAx..." />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {saving ? "Salvando..." : "Salvar Produto"}
                </button>
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                {editing.id && (
                  <button type="button" onClick={() => handleDelete(editing)} className="ml-auto flex items-center gap-1.5 px-4 py-2 text-red-600 font-medium hover:bg-red-50 rounded-lg text-sm transition-colors">
                    <Trash2 size={14} /> Excluir Produto
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Grid de Produtos */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map(p => {
            const s = stats.get(p.slug) || { paid: 0, revenue: 0 };
            return (
              <div key={p.slug} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                {/* Banner */}
                <div className="h-28 relative" style={{ backgroundColor: (p.accent_color || "#10b981") + "18" }}>
                  {p.image_src ? (
                    <img src={p.image_src} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: p.accent_color || "#10b981" }}>
                      <Package size={32} />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: p.accent_color || "#10b981" }} />
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 leading-tight">{p.title}</h3>
                    <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">/{p.slug}</span>
                  </div>
                  <p className="text-sm font-semibold mb-4" style={{ color: p.accent_color || "#10b981" }}>{brl(Number(p.price || 0))}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-emerald-600 mb-1"><CheckCircle size={13} /><span className="text-[10px] font-bold text-gray-400 uppercase">Vendas</span></div>
                      <p className="text-lg font-bold text-gray-900">{s.paid}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1"><TrendingUp size={13} /><span className="text-[10px] font-bold text-gray-400 uppercase">Receita</span></div>
                      <p className="text-lg font-bold text-gray-900">{brl(s.revenue)}</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-auto flex items-center gap-2">
                    <Link
                      href={`/admin/${p.slug}`}
                      className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: p.accent_color || "#10b981" }}
                    >
                      Ver Painel
                    </Link>
                    {isAdmin && (
                      <button onClick={() => setEditing(p)} title="Editar página de checkout" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button onClick={() => copyLink(p.slug)} title="Copiar link do checkout" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative">
                      {copied === p.slug ? <CheckCircle size={16} className="text-emerald-500" /> : <LinkIcon size={16} />}
                    </button>
                    <a href={`${CHECKOUT_BASE_URL}/${p.slug}`} target="_blank" rel="noopener noreferrer" title="Abrir checkout" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
              <X size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">Nenhum produto cadastrado</p>
              <p className="text-sm mt-1">Clique em &quot;Novo Produto&quot; para criar sua primeira página de checkout.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
