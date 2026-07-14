"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, Trash2, Key, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface UserRole {
  email: string;
  role: string;
  created_at: string;
  utm_code?: string | null;
}

const OWNER_EMAIL = "henryccost@gmail.com";

const ROLES = [
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "VIEWER", label: "Visualizador" },
  { value: "EMMY", label: "Emmy" },
  { value: "ANA", label: "Ana" },
  { value: "ADMIN", label: "Administrador" },
  { value: "SUPERADMIN", label: "Super Admin" },
];

export default function EquipePage() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("VIEWER");
  const [newUtmCode, setNewUtmCode] = useState("");

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setMyEmail(session?.user?.email || null);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
     
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vendedor sem código UTM não teria como ter vendas atribuídas — obrigatório
    if (newRole === "VENDEDOR" && !newUtmCode.trim()) {
      alert("Pra role Vendedor o Código UTM é obrigatório (é ele que define quais vendas a pessoa enxerga).");
      return;
    }

    setAdding(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole, utm_code: newUtmCode || null })
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao adicionar: " + (err.error || "Desconhecido"));
      } else {
        setNewEmail("");
        setNewPassword("");
        setNewRole("VIEWER");
        setNewUtmCode("");
        fetchUsers();
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setAdding(false);
    }
  };

  const handleEditUtmCode = async (u: UserRole) => {
    const input = window.prompt(
      `Código UTM de ${u.email}\n(só letras minúsculas, números, hífen; vazio remove o código)`,
      u.utm_code || ""
    );
    if (input === null) return; // cancelou
    const code = input.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ email: u.email, role: u.role, utm_code: code || null })
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao salvar código: " + (err.error || "Desconhecido"));
      } else {
        fetchUsers();
      }
    } catch {
      alert("Erro de conexão");
    }
  };

  const handleChangeRole = async (u: UserRole, novaRole: string) => {
    if (novaRole === u.role) return;
    // Rebaixar a própria conta pode trancar você fora — confirma antes
    if (u.email === myEmail && novaRole !== "SUPERADMIN") {
      if (!confirm("Você está alterando o SEU PRÓPRIO cargo. Pode perder o acesso a esta página. Continuar?")) return;
    }

    setChangingRole(u.email);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Envia só email + role: utm_code é omitido e preservado no upsert
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ email: u.email, role: novaRole })
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao alterar cargo: " + (err.error || "Desconhecido"));
      }
      await fetchUsers();
    } catch {
      alert("Erro de conexão");
    } finally {
      setChangingRole(null);
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
    } catch {
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
              <label className="text-xs font-semibold text-gray-600 block mb-1">Código UTM <span className="font-normal text-gray-400">(pra página Meus Links)</span></label>
              <input
                type="text"
                value={newUtmCode} onChange={e => setNewUtmCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ex: crla"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Nível de Permissão</label>
              <select 
                value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VENDEDOR">Vendedor (vê só as próprias vendas, 30 dias)</option>
                <option value="VIEWER">Visualizador (vê tudo dos últimos 30 dias)</option>
                <option value="EMMY">Emmy (visualiza + define início do Partiu 10k)</option>
                <option value="ANA">Ana (vê e opera tudo, exceto Equipe)</option>
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
                  <th className="p-4 font-medium">Código UTM</th>
                  <th className="p-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 text-sm">Carregando equipe...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 text-sm">Nenhum usuário encontrado.</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.email} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900 text-sm">{u.email}</div>
                        <div className="text-xs text-gray-400">Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                      </td>
                      <td className="p-4">
                        {u.email === OWNER_EMAIL ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200" title="O dono da conta é sempre Super Admin">
                            SUPERADMIN 🔒
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={changingRole === u.email}
                            onChange={e => handleChangeRole(u, e.target.value)}
                            className={`text-xs font-medium border rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
                              u.role === 'SUPERADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              u.role === 'ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              u.role === 'ANA' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                              u.role === 'VENDEDOR' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.value}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleEditUtmCode(u)}
                          className="group inline-flex items-center gap-1.5"
                          title="Editar código UTM"
                        >
                          {u.utm_code ? (
                            <span className="font-mono text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md group-hover:bg-emerald-100 transition-colors">{u.utm_code}</span>
                          ) : (
                            <span className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors">definir código</span>
                          )}
                        </button>
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
