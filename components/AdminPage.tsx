import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Search, 
  Users, 
  Crown, 
  UserCog, 
  Mail,
  Calendar,
  AlertTriangle,
  Check,
  X,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { AppState, User, UserRole } from '../types';
import { api } from '../services/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';

interface AdminPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

interface UserWithDetails extends User {
  createdAt?: string;
  lastLogin?: string;
}

interface NewUserForm {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

const AdminPage: React.FC<AdminPageProps> = ({ state }) => {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: 'promote' | 'demote' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado para criar usuário
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    password: '',
    name: '',
    role: 'USER'
  });

  // Verificar se o usuário atual é admin
  const isAdmin = state.user?.role === 'ADMIN';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await api.getAllUsers();
      setUsers(fetchedUsers);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isAdmin) return;
    
    // Não permitir que o admin remova seu próprio acesso
    if (userId === state.user?.id && newRole === 'USER') {
      setError('Você não pode remover seu próprio acesso de administrador');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await api.updateUserRole(userId, newRole);
      
      // Atualizar lista local
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      setSuccess(`Usuário ${newRole === 'ADMIN' ? 'promovido a administrador' : 'removido dos administradores'} com sucesso!`);
      setConfirmAction(null);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar permissões');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.email || !newUser.password || !newUser.name) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (newUser.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setCreateLoading(true);
      setError(null);
      
      const createdUser = await api.createUser({
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: newUser.role
      });
      
      // Adicionar à lista local
      setUsers(prev => [createdUser, ...prev]);
      
      // Limpar formulário
      setNewUser({ email: '', password: '', name: '', role: 'USER' });
      setShowCreateUser(false);
      setSuccess(`Usuário "${newUser.name}" criado com sucesso!`);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const admins = filteredUsers.filter(u => u.role === 'ADMIN');
  const regularUsers = filteredUsers.filter(u => u.role === 'USER');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full mb-6">
          <ShieldX className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Acesso Restrito</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar usuários.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Shield className="text-indigo-500" />
            Gerenciar Usuários
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie usuários e acessos de administrador do sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30"
        >
          <UserPlus className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      {/* Modal Criar Usuário */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-500" />
                  Novo Usuário
                </h2>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 dark:text-white"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipo de Usuário
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewUser(prev => ({ ...prev, role: 'USER' }))}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      newUser.role === 'USER'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <UserCog className="w-5 h-5" />
                    <span className="font-medium">Usuário</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUser(prev => ({ ...prev, role: 'ADMIN' }))}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      newUser.role === 'ADMIN'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Crown className="w-5 h-5" />
                    <span className="font-medium">Admin</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Criar Usuário
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Total de Usuários</p>
                <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
              </div>
              <Users className="w-10 h-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Administradores</p>
                <p className="text-3xl font-bold text-white mt-1">{admins.length}</p>
              </div>
              <Crown className="w-10 h-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Usuários Regulares</p>
                <p className="text-3xl font-bold text-white mt-1">{regularUsers.length}</p>
              </div>
              <UserCog className="w-10 h-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Administradores */}
          {admins.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Administradores
                </CardTitle>
                <CardDescription>Usuários com acesso total ao sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {admins.map(user => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    currentUserId={state.user?.id}
                    onRoleChange={(newRole) => {
                      setConfirmAction({ userId: user.id, action: 'demote' });
                    }}
                    confirmAction={confirmAction}
                    actionLoading={actionLoading}
                    onConfirm={() => handleRoleChange(user.id, 'USER')}
                    onCancel={() => setConfirmAction(null)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Usuários Regulares */}
          {regularUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-slate-500" />
                  Usuários
                </CardTitle>
                <CardDescription>Usuários com acesso padrão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {regularUsers.map(user => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    currentUserId={state.user?.id}
                    onRoleChange={(newRole) => {
                      setConfirmAction({ userId: user.id, action: 'promote' });
                    }}
                    confirmAction={confirmAction}
                    actionLoading={actionLoading}
                    onConfirm={() => handleRoleChange(user.id, 'ADMIN')}
                    onCancel={() => setConfirmAction(null)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">
                Nenhum usuário encontrado
              </h3>
              <p className="text-slate-500 dark:text-slate-500 mt-1">
                Tente buscar com outros termos
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface UserCardProps {
  user: UserWithDetails;
  currentUserId?: string;
  onRoleChange: (newRole: UserRole) => void;
  confirmAction: { userId: string; action: 'promote' | 'demote' } | null;
  actionLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  currentUserId, 
  onRoleChange, 
  confirmAction, 
  actionLoading,
  onConfirm,
  onCancel
}) => {
  const isCurrentUser = user.id === currentUserId;
  const isAdmin = user.role === 'ADMIN';
  const showConfirm = confirmAction?.userId === user.id;

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <img 
        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
        alt={user.name}
        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-slate-800 dark:text-white truncate">
            {user.name}
          </h4>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-xs">Você</Badge>
          )}
          {isAdmin && (
            <Badge variant="warning" className="text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <Mail className="w-3.5 h-3.5" />
          <span className="truncate">{user.email}</span>
        </div>
        {user.createdAt && (
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
            <Calendar className="w-3 h-3" />
            <span>Desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      <div className="shrink-0">
        {showConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {confirmAction?.action === 'promote' ? 'Promover?' : 'Remover?'}
            </span>
            <button
              onClick={onConfirm}
              disabled={actionLoading}
              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={onCancel}
              disabled={actionLoading}
              className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onRoleChange(isAdmin ? 'USER' : 'ADMIN')}
            disabled={isCurrentUser}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isCurrentUser
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : isAdmin
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
                  : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
            }`}
          >
            {isAdmin ? (
              <>
                <ShieldX className="w-4 h-4" />
                <span className="hidden sm:inline">Remover Admin</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Tornar Admin</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
