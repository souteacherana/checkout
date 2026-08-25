/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "../actions";
import {
  Package, Plus, Edit2, Trash2, ExternalLink, LinkIcon,
  TrendingUp, CheckCircle, X, Archive, ArchiveRestore, Target
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
  google_ads_conversion_id: string | null;
  google_ads_conversion_label: string | null;
  landing_url: string | null;
  archived_at?: string | null;
  destino_padrao?: boolean;
  tem_aula_ao_vivo: boolean;
  zoom_link: string | null;
  zoom_datetime: string | null;
};

const emptyProduct: Product = {
  slug: "", title: "", price: "", accent_color: "#10b981", accent_color_hover: "#059669",
  image_src: "", fb_pixel_id: "", fb_capi_token: "", landing_url: "", archived_at: null,
  google_ads_conversion_id: "", google_ads_conversion_label: "",
  // Workshop é o caso comum; desmarcar é a exceção.
  destino_padrao: false, tem_aula_ao_vivo: true, zoom_link: "", zoom_datetime: ""
};

// A aula é sempre anunciada em horário de Brasília, mas <input type="datetime-local">
// interpreta o que se digita no fuso DA MÁQUINA de quem preenche. Alguém em
// Cuiabá (UTC-4) digitando 15:00 gravava 16h00 de Brasília, e o aluno recebia
// o horário errado. As duas funções abaixo prendem o campo a Brasília,
// independente de onde a pessoa da equipe estiver.
//
// Offset fixo porque o Brasil não tem horário de verão desde 2019. Se algum dia
// voltar, isto aqui precisa virar conversão por fuso nomeado.
const OFFSET_BRASILIA = "-03:00";

/** ISO (UTC) -> "YYYY-MM-DDTHH:mm" em Brasília, formato do input. */
const isoParaCampoBrasilia = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo",
  }).format(d);
  const hora = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo", hourCycle: "h23",
  }).format(d);
  return `${data}T${hora}`;
};

/** "YYYY-MM-DDTHH:mm" digitado como horário de Brasília -> ISO UTC. */
const campoBrasiliaParaIso = (valor: string | null) =>
  valor ? new Date(`${valor}:00${OFFSET_BRASILIA}`).toISOString() : null;

type ProductStats = { produto_slug: string | null; vendas: number; receita: number };

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ProdutosPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [statsRows, setStatsRows] = useState<ProductStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("VIEWER");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const isAdmin = ["ANA", "ADMIN", "SUPERADMIN"].includes(role);
  const isSuperAdmin = role === "SUPERADMIN";

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
        getUserRole(session.user.email).then(r => setRole(r));
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

  // O formulário trabalha com o horário de Brasília como texto; o banco guarda
  // UTC. A conversão acontece ao abrir (aqui) e ao salvar (em handleSave).
  // O `?? true` cobre a janela entre subir este código e rodar a migração 023:
  // sem a coluna, o toggle viria indefinido e o formulário abriria dizendo que
  // um workshop não é workshop.
  const abrirEdicao = (p: Product) =>
    setEditing({
      ...p,
      tem_aula_ao_vivo: p.tem_aula_ao_vivo ?? true,
      zoom_datetime: isoParaCampoBrasilia(p.zoom_datetime),
    });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);

    // Normaliza a landing (aceita colar sem https://)
    let landing = (editing.landing_url || "").trim();
    if (landing && !/^https?:\/\//i.test(landing)) landing = `https://${landing}`;

    const payload = {
      slug: editing.slug.toLowerCase(),
      title: editing.title,
      price: Number(editing.price),
      accent_color: editing.accent_color,
      accent_color_hover: editing.accent_color_hover,
      image_src: editing.image_src,
      fb_pixel_id: editing.fb_pixel_id || null,
      fb_capi_token: editing.fb_capi_token || null,
      google_ads_conversion_id: editing.google_ads_conversion_id?.trim() || null,
      google_ads_conversion_label: editing.google_ads_conversion_label?.trim() || null,
      landing_url: landing || null,
      tem_aula_ao_vivo: editing.tem_aula_ao_vivo,
      // Desmarcar "aula ao vivo" limpa os campos do Zoom em vez de deixá-los
      // parados no banco: quem decide mandar o e-mail da sala é o webhook do
      // Asaas, olhando o zoom_link. Um link esquecido aqui viraria e-mail de
      // sala numa compra que não tem aula.
      zoom_link: editing.tem_aula_ao_vivo ? editing.zoom_link : null,
      // O state guarda o horário de Brasília digitado; converte pra UTC ao salvar.
      zoom_datetime: editing.tem_aula_ao_vivo ? campoBrasiliaParaIso(editing.zoom_datetime) : null,
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

  /**
   * Marca (ou desmarca) o produto como destino padrão do site.
   *
   * O banco tem índice único: dois produtos marcados ao mesmo tempo é recusado
   * lá, não só aqui. Por isso limpa o anterior ANTES de marcar o novo — se
   * marcasse primeiro, o update esbarraria no índice e não aconteceria nada.
   */
  const definirDestinoPadrao = async (p: Product) => {
    if (!p.id) return;
    const ativando = !p.destino_padrao;

    if (!ativando && !confirm(`Tirar "${p.title}" de destino padrão?\n\nSem nenhum produto marcado, a raiz do site e os links quebrados voltam a mostrar "nenhuma turma aberta" em vez de levar pra uma página de venda.`)) return;

    const { error: erroLimpar } = await supabase
      .from("products")
      .update({ destino_padrao: false })
      .eq("destino_padrao", true);

    if (erroLimpar) {
      alert("Erro ao trocar o destino padrão: " + erroLimpar.message);
      return;
    }

    if (ativando) {
      const { error } = await supabase
        .from("products")
        .update({ destino_padrao: true })
        .eq("id", p.id);

      if (error) {
        alert("Erro ao definir o destino padrão: " + error.message);
        fetchAll(); // o anterior já foi limpo — recarrega pra tela não mentir
        return;
      }
    }

    fetchAll();
  };

  const toggleArchive = async (p: Product) => {
    if (!p.id) return;
    const archiving = !p.archived_at;
    // Arquivar o destino padrão foi exatamente o que derrubou a raiz do site
    // quando o HYB saiu do ar: o produto sumiu, o destino continuou apontando
    // pra ele. Agora a marca sai junto — e o aviso diz isso antes.
    const eraDestino = archiving && !!p.destino_padrao;
    if (archiving && !confirm(`Ocultar "${p.title}"?\n\nA página de checkout sai do ar e ele some dos links da equipe e da sidebar. O histórico de vendas e o painel continuam acessíveis, e dá pra reativar quando quiser.${eraDestino ? '\n\nATENÇÃO: ele é o destino padrão do site. Ao ocultar, o site fica sem destino definido até você marcar outro produto.' : ''}`)) return;

    const { error } = await supabase
      .from("products")
      .update({
        archived_at: archiving ? new Date().toISOString() : null,
        ...(eraDestino ? { destino_padrao: false } : {}),
      })
      .eq("id", p.id);

    if (error) alert("Erro ao " + (archiving ? "ocultar" : "reativar") + ": " + error.message);
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
          <div className="flex items-center gap-2">
            {products.some(p => p.archived_at) && (
              <button
                onClick={() => setShowArchived(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showArchived
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Archive size={15} /> {showArchived ? "Ocultar arquivados" : `Arquivados (${products.filter(p => p.archived_at).length})`}
              </button>
            )}
            {isAdmin && !editing && (
              <button
                onClick={() => setEditing(emptyProduct)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-all"
              >
                <Plus size={16} /> Novo Produto
              </button>
            )}
          </div>
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
              {/* Workshop com aula ao vivo? É isto que liga a obrigatoriedade do
                  Zoom — e o e-mail automático com a sala depois do pagamento.
                  Produto que não é aula ao vivo não precisa mais de link
                  inventado só pra passar na validação. */}
              <div className="md:col-span-2 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={editing.tem_aula_ao_vivo}
                  onClick={() => setEditing({ ...editing, tem_aula_ao_vivo: !editing.tem_aula_ao_vivo })}
                  className={`mt-0.5 relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    editing.tem_aula_ao_vivo ? "bg-emerald-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                      editing.tem_aula_ao_vivo ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <div className="text-sm">
                  <p className="font-semibold text-gray-800">É um workshop com aula ao vivo</p>
                  <p className="text-gray-500 mt-0.5">
                    {editing.tem_aula_ao_vivo
                      ? "O link e o horário da sala são obrigatórios, e o aluno recebe o e-mail com a sala assim que o pagamento é confirmado."
                      : "Sem aula ao vivo: nenhum campo de Zoom é pedido e nenhum e-mail de sala é enviado após a compra."}
                  </p>
                </div>
              </div>

              {editing.tem_aula_ao_vivo && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Link da Sala do Zoom</label>
                    <input required type="url" value={editing.zoom_link || ""} onChange={e => setEditing({ ...editing, zoom_link: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="https://zoom.us/j/..." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data e Hora da Aula <span className="font-normal text-gray-400">(horário de Brasília)</span></label>
                    <input required type="datetime-local" value={editing.zoom_datetime || ""} onChange={e => setEditing({ ...editing, zoom_datetime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">URL da Landing Page <span className="font-normal text-gray-400">(opcional — os links da equipe apontam pra ela; sem ela, vão direto pro checkout)</span></label>
                <input type="text" value={editing.landing_url || ""} onChange={e => setEditing({ ...editing, landing_url: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="https://riseeducacao.com.br/tft" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Facebook Pixel ID <span className="font-normal text-gray-400">(opcional)</span></label>
                <input type="text" value={editing.fb_pixel_id || ""} onChange={e => setEditing({ ...editing, fb_pixel_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="1084815..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Token CAPI <span className="font-normal text-gray-400">(opcional)</span></label>
                <input type="password" value={editing.fb_capi_token || ""} onChange={e => setEditing({ ...editing, fb_capi_token: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="EAAx..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ID de Conversão do Google Ads <span className="font-normal text-gray-400">(opcional)</span></label>
                <input type="text" value={editing.google_ads_conversion_id || ""} onChange={e => setEditing({ ...editing, google_ads_conversion_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="AW-17580476040" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rótulo de Conversão do Google Ads <span className="font-normal text-gray-400">(opcional)</span></label>
                <input type="text" value={editing.google_ads_conversion_label || ""} onChange={e => setEditing({ ...editing, google_ads_conversion_label: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="OwCmCPjiseMcEIiNg79B" />
              </div>
              <p className="md:col-span-2 -mt-2 text-xs text-gray-400">
                Os dois campos do Google Ads andam juntos: o rótulo pertence a uma conta específica.
                Preenchendo só um deles, o produto usa a conversão de Compra padrão da conta.
              </p>

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
          {products.filter(p => showArchived || !p.archived_at).map(p => {
            const s = stats.get(p.slug) || { paid: 0, revenue: 0 };
            const archived = !!p.archived_at;
            const ehDestino = !!p.destino_padrao;
            return (
              <div key={p.slug} className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col transition-shadow ${archived ? "border-gray-200 opacity-75" : "border-gray-200 hover:shadow-md"}`}>
                {/* Banner */}
                <div className="h-28 relative" style={{ backgroundColor: (p.accent_color || "#10b981") + "18" }}>
                  {archived && (
                    <span className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-gray-800/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                      <Archive size={11} /> Arquivado
                    </span>
                  )}
                  {ehDestino && !archived && (
                    <span
                      className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm"
                      title="A raiz do site e os links quebrados levam pra este produto"
                    >
                      <Target size={11} /> Destino padrão
                    </span>
                  )}
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
                    {isAdmin && !archived && (
                      <button
                        onClick={() => definirDestinoPadrao(p)}
                        title={ehDestino
                          ? "É o destino padrão do site — clique pra tirar"
                          : "Definir como destino padrão do site (a raiz e os links quebrados passam a levar pra cá)"}
                        className={`p-2 rounded-lg transition-colors ${ehDestino
                          ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                          : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"}`}
                      >
                        <Target size={16} />
                      </button>
                    )}
                    {isAdmin && !archived && (
                      <button onClick={() => abrirEdicao(p)} title="Editar página de checkout" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                    )}
                    {!archived && (
                      <>
                        <button onClick={() => copyLink(p.slug)} title="Copiar link do checkout" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative">
                          {copied === p.slug ? <CheckCircle size={16} className="text-emerald-500" /> : <LinkIcon size={16} />}
                        </button>
                        <a href={`${CHECKOUT_BASE_URL}/${p.slug}`} target="_blank" rel="noopener noreferrer" title="Abrir checkout" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <ExternalLink size={16} />
                        </a>
                      </>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => toggleArchive(p)}
                        title={archived ? "Reativar produto" : "Ocultar produto (arquivar)"}
                        className={`p-2 rounded-lg transition-colors ${archived ? "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                      >
                        {archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      </button>
                    )}
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
