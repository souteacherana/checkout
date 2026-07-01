"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Link as LinkIcon, Image as ImageIcon } from "lucide-react";

export default function CheckoutsManager() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    slug: '', title: '', price: '', accent_color: '', accent_color_hover: '', image_src: ''
  });

  useEffect(() => {
    // Verificar permissão de super admin
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user?.email !== "henryccost@gmail.com") {
        router.push("/admin");
      } else {
        fetchProducts();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (formData.id) {
      // Update
      const { error } = await supabase.from('products').update({
        slug: formData.slug.toLowerCase(),
        title: formData.title,
        price: Number(formData.price),
        accent_color: formData.accent_color,
        accent_color_hover: formData.accent_color_hover,
        image_src: formData.image_src
      }).eq('id', formData.id);
      
      if (error) alert("Erro ao atualizar: " + error.message);
    } else {
      // Insert
      const { error } = await supabase.from('products').insert([{
        slug: formData.slug.toLowerCase(),
        title: formData.title,
        price: Number(formData.price),
        accent_color: formData.accent_color,
        accent_color_hover: formData.accent_color_hover,
        image_src: formData.image_src
      }]);
      if (error) alert("Erro ao criar: " + error.message);
    }
    
    setFormData({ slug: '', title: '', price: '', accent_color: '', accent_color_hover: '', image_src: '' });
    setIsEditing(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza? Esta página de checkout será deletada permanentemente.")) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  if (loading && products.length === 0) return <div className="p-10 flex items-center gap-3"><div className="animate-spin w-5 h-5 border-2 border-emerald-500 rounded-full border-b-transparent"></div>Carregando gerenciador...</div>;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Páginas de Checkout</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os produtos, preços e design das suas páginas de vendas.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Novo Produto
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8 shadow-sm">
          <h2 className="text-lg font-bold mb-4">{formData.id ? 'Editar Produto' : 'Criar Novo Produto'}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Título do Produto</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Ex: Máquina de Alunos" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">URL (Slug)</label>
              <input required type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Ex: mda" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (R$)</label>
              <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="49.90" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">URL do Banner Principal</label>
              <input type="text" value={formData.image_src || ''} onChange={e => setFormData({...formData, image_src: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cor Principal (HEX)</label>
              <div className="flex gap-2">
                <input type="color" value={formData.accent_color || '#10b981'} onChange={e => setFormData({...formData, accent_color: e.target.value})} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                <input type="text" value={formData.accent_color || ''} onChange={e => setFormData({...formData, accent_color: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="#10b981" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cor ao Passar o Mouse (Hover)</label>
              <div className="flex gap-2">
                <input type="color" value={formData.accent_color_hover || '#059669'} onChange={e => setFormData({...formData, accent_color_hover: e.target.value})} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                <input type="text" value={formData.accent_color_hover || ''} onChange={e => setFormData({...formData, accent_color_hover: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="#059669" />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
              <button type="button" onClick={() => { setIsEditing(false); setFormData({ slug: '', title: '', price: '', accent_color: '', accent_color_hover: '', image_src: '' }); }} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">{loading ? 'Salvando...' : 'Salvar Produto'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col group hover:border-emerald-200 transition-colors">
            <div className="h-32 bg-gray-100 relative">
              {p.image_src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_src} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50"><ImageIcon size={32} /></div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button onClick={() => { setFormData(p); setIsEditing(true); }} className="p-2 bg-white rounded-lg text-gray-700 hover:text-blue-600 hover:shadow-lg transition-all"><Edit2 size={18} /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 bg-white rounded-lg text-gray-700 hover:text-red-600 hover:shadow-lg transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-gray-900 line-clamp-2" title={p.title}>{p.title}</h3>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md flex-shrink-0">R$ {p.price}</span>
              </div>
              <div className="flex items-center gap-2 mt-auto text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                <LinkIcon size={14} className="flex-shrink-0" />
                <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 truncate font-mono">/{p.slug}</a>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && !loading && (
           <div className="col-span-full py-12 text-center text-gray-500">
              Nenhum produto cadastrado ainda.
           </div>
        )}
      </div>
    </div>
  );
}
