 
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getUserProfile } from "../actions";
import { Link2, Copy, CheckCircle, Package, ExternalLink, AlertCircle } from "lucide-react";

const CHECKOUT_BASE_URL = "https://checkout.riseeducacao.com.br";

type Product = {
  slug: string;
  title: string;
  price: number;
  accent_color: string | null;
  image_src: string | null;
  landing_url: string | null;
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function MeusLinksPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [utmCode, setUtmCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
        return;
      }
      const [profile, { data: prods }] = await Promise.all([
        getUserProfile(session.user?.email || ""),
        supabase.from("products").select("slug, title, price, accent_color, image_src, landing_url").is("archived_at", null).order("title"),
      ]);
      setUtmCode(profile.utm_code);
      setProducts(prods || []);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildLink = useMemo(() => {
    return (p: Product) => {
      // Landing page do workshop quando cadastrada; senão, checkout direto
      const base = p.landing_url || `${CHECKOUT_BASE_URL}/${p.slug}`;
      if (!utmCode) return base;
      try {
        // Código da pessoa nos três parâmetros — simples de identificar em qualquer relatório
        const url = new URL(base);
        url.searchParams.set("utm_source", utmCode);
        url.searchParams.set("utm_medium", utmCode);
        url.searchParams.set("utm_content", utmCode);
        return url.toString();
      } catch {
        return base; // landing_url inválida: entrega sem UTM em vez de quebrar
      }
    };
  }, [utmCode]);

  const copyLink = (p: Product) => {
    navigator.clipboard.writeText(buildLink(p));
    setCopied(p.slug);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-500 font-medium">Carregando seus links...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
              <Link2 size={16} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Meus Links</h1>
              <p className="text-xs text-gray-400 -mt-0.5">
                {utmCode
                  ? <>Suas vendas serão atribuídas ao código <span className="font-mono font-bold text-indigo-600">{utmCode}</span></>
                  : "Links de divulgação dos produtos"}
              </p>
            </div>
          </div>

        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {!utmCode && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3 text-sm">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p>
              Você ainda <b>não tem um código UTM</b> definido — os links abaixo funcionam,
              mas as vendas não serão atribuídas a você. Peça a um Super Admin para definir
              seu código na página <b>Equipe</b>.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {products.map(p => {
            const link = buildLink(p);
            const accent = p.accent_color || "#10b981";
            return (
              <div key={p.slug} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 sm:w-64 flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: accent }}>
                    <Package size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight truncate">{p.title}</p>
                    <p className="text-xs font-semibold" style={{ color: accent }}>
                      {brl(Number(p.price || 0))}
                      <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">{p.landing_url ? "landing" : "checkout"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <input
                    readOnly
                    value={link}
                    onFocus={e => e.target.select()}
                    className="flex-1 min-w-0 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 truncate focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={() => copyLink(p)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
                      copied === p.slug
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {copied === p.slug ? <><CheckCircle size={15} /> Copiado!</> : <><Copy size={15} /> Copiar</>}
                  </button>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Testar link"
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
              Nenhum produto cadastrado ainda.
            </div>
          )}
        </div>

        {utmCode && (
          <p className="text-xs text-gray-400 mt-6 text-center">
            É só copiar e divulgar — toda venda que entrar por esse link fica registrada no seu código.
          </p>
        )}
      </main>
    </div>
  );
}
