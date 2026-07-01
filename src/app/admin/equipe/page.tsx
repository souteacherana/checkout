"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, Trash2, Key, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface UserRole {
  email: string;
  role: string;
  created_at: string;
}

export default function EquipePage() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("VIEWER");

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole })
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao adicionar: " + (err.error || "Desconhecido"));
      } else {
        setNewEmail("");
        setNewPassword("");
        setNewRole("VIEWER");
        fetchUsers();
      }
    } catch (err) {
      alert("Erro de conexão");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Tem certeza que deseja remover o acesso de ${email}?`)) return;
    
    setDeleting(email);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ email })
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao remover: " + (err.error || "Desconhecido"));
      } else {
        fetchUsers();
      }
    } catch (err) {
      alert("Erro de conexão");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe e Permissões</h1>
          <p className="text-sm text-gray-500">Gerencie quem tem acesso ao painel administrativo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Adição */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-gray-400" />
            Adicionar Membro
          </h2>
          
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">E-mail de Acesso</label>
              <input 
                type="email" required
                value={newEmail} onChange={e => setNewEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="colaborador@empresa.com"
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Senha Temporária</label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Deixe em branco se a pessoa já tiver conta"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Nível de Permissão</label>
              <select 
                value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VIEWER">Apenas Visualizador (Ex: Suporte)</option>
                <option value="ADMIN">Administrador (Pode editar checkouts)</option>
                <option value="SUPERADMIN">Super Admin (Acesso total)</option>
              </select>
            </div>

            <button 
              type="submit" disabled={adding}
              className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {adding ? "Adicionando..." : "Salvar Membro"}
            </button>
          </form>
        </div>

        {/* Lista de Equipe */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={18} className="text-gray-400" />
              Membros Ativos
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">Usuário</th>
                  <th className="p-4 font-medium">Permissão</th>
                  <th className="p-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400 text-sm">Carregando equipe...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400 text-sm">Nenhum usuário encontrado.</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.email} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900 text-sm">{u.email}</div>
                        <div className="text-xs text-gray-400">Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                          u.role === 'SUPERADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          u.role === 'ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {u.email !== 'henryccost@gmail.com' && (
                          <button 
                            onClick={() => handleDeleteUser(u.email)}
                            disabled={deleting === u.email}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Remover acesso"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
