
import { createClient } from '@supabase/supabase-js';
import { Promotion, Group, Category, User } from '../types';

const supabaseUrl = 'https://behdyuplqoxgdbujzkob.supabase.co';
const supabaseKey = 'sb_publishable_OHdZ5yIbqvoowxDpmIEYqQ_xNzoMIB7';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Sistema de logs para depuração visual no app
export const debugLogs: { timestamp: string; method: string; status: string; details: any }[] = [];

export const addLog = (method: string, status: 'SUCCESS' | 'ERROR' | 'INFO' | 'CLICK', details: any) => {
  const log = {
    timestamp: new Date().toLocaleTimeString(),
    method,
    status,
    details
  };
  debugLogs.unshift(log);
  if (debugLogs.length > 50) debugLogs.pop();
  console.log(`[Supabase ${status}] ${method}:`, details);
  window.dispatchEvent(new CustomEvent('supabase-log-update'));
};

const handleSupabaseError = (error: any, method: string) => {
  const isRLS = error.code === '42501' || error.status === 403;
  const message = isRLS 
    ? `Erro de Permissão (RLS): Sua sessão pode ter expirado ou você não tem permissão para esta ação.`
    : error.message || 'Erro desconhecido no servidor';
  
  addLog(method, 'ERROR', { ...error, friendlyMessage: message });
  return new Error(message);
};

// --- Mappers ---

const mapPromoFromDB = (p: any): Promotion => ({
  id: p.id,
  title: p.title,
  price: p.price,
  link: p.link,
  coupon: p.coupon,
  imageUrl: p.image_url,
  mainCategoryId: p.main_category_id,
  secondaryCategoryIds: p.secondary_category_ids || [],
  status: p.status,
  scheduledAt: p.scheduled_at,
  sentAt: p.sent_at,
  ownerId: p.owner_id,
  content: p.content,
  targetGroupIds: p.target_group_ids || [],
  createdAt: p.created_at
});

const mapPromoToDB = (p: Promotion) => ({
  id: p.id,
  title: p.title,
  price: p.price,
  link: p.link,
  coupon: p.coupon,
  image_url: p.imageUrl,
  main_category_id: p.mainCategoryId,
  secondary_category_ids: p.secondaryCategoryIds,
  status: p.status,
  scheduled_at: p.scheduledAt,
  sent_at: p.sentAt,
  owner_id: p.ownerId,
  content: p.content,
  target_group_ids: p.targetGroupIds
});

const mapGroupFromDB = (g: any): Group => ({
  id: g.id,
  name: g.name,
  platform: g.platform,
  apiIdentifier: g.api_identifier,
  categories: g.categories || [],
  ownerId: g.owner_id,
  createdAt: g.created_at
});

const mapGroupToDB = (g: Group) => ({
  id: g.id,
  name: g.name,
  platform: g.platform,
  api_identifier: g.apiIdentifier,
  categories: g.categories,
  owner_id: g.ownerId
});

// --- Services ---

export const api = {
  /**
   * Realiza login usando Supabase Auth (Gera o Token JWT necessário para RLS)
   */
  async login(email: string, password: string): Promise<User> {
    addLog('auth.signIn', 'INFO', { email });
    
    // 1. Autentica no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      addLog('auth.signIn', 'ERROR', authError);
      throw new Error('E-mail ou senha inválidos no sistema de autenticação.');
    }

    // 2. Busca dados adicionais (role, nome) na nossa tabela pública de usuários
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      addLog('profile.fetch', 'ERROR', profileError || 'Profile not found');
      // Se não houver perfil mas o auth deu certo, criamos um objeto básico
      return {
        id: authData.user.id,
        name: authData.user.email?.split('@')[0] || 'Usuário',
        email: authData.user.email || '',
        role: 'USER',
        avatar: `https://ui-avatars.com/api/?name=User`
      };
    }

    addLog('login.complete', 'SUCCESS', { name: profile.name });
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as 'ADMIN' | 'USER',
      avatar: profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random`
    };
  },

  async logout() {
    addLog('auth.signOut', 'INFO', 'Saindo...');
    await supabase.auth.signOut();
  },

  async fetchAll() {
    addLog('fetchAll', 'INFO', 'Fetching all data');
    const [promos, groups, cats] = await Promise.all([
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true })
    ]);

    const result = {
      promotions: (promos.data || []).map(mapPromoFromDB),
      groups: (groups.data || []).map(mapGroupFromDB),
      categories: (cats.data || []) as Category[]
    };
    addLog('fetchAll', 'SUCCESS', { 
      promos: (promos.data || []).length, 
      groups: (groups.data || []).length, 
      cats: (cats.data || []).length 
    });
    return result;
  },

  async savePromotion(promo: Promotion) {
    addLog('savePromotion', 'INFO', { id: promo.id });
    const { error } = await supabase.from('promotions').upsert(mapPromoToDB(promo));
    if (error) throw handleSupabaseError(error, 'savePromotion');
    addLog('savePromotion', 'SUCCESS', promo.id);
  },

  async deletePromotion(id: string) {
    addLog('API_START_deletePromotion', 'INFO', { id });
    const { error, data } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw handleSupabaseError(error, 'deletePromotion');
    if (!data || data.length === 0) throw new Error(`A promoção não foi encontrada.`);
    addLog('deletePromotion', 'SUCCESS', data);
    return data;
  },

  async saveGroup(group: Group) {
    addLog('saveGroup', 'INFO', { id: group.id });
    const { error } = await supabase.from('groups').upsert(mapGroupToDB(group));
    if (error) throw handleSupabaseError(error, 'saveGroup');
    addLog('saveGroup', 'SUCCESS', group.id);
  },

  async deleteGroup(id: string) {
    addLog('API_START_deleteGroup', 'INFO', { id });
    const { error, data } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw handleSupabaseError(error, 'deleteGroup');
    if (!data || data.length === 0) throw new Error(`O grupo não foi encontrado.`);
    addLog('deleteGroup', 'SUCCESS', data);
    return data;
  },

  async saveCategory(category: Category) {
    addLog('saveCategory', 'INFO', { id: category.id });
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      color: category.color
    }); 
    if (error) throw handleSupabaseError(error, 'saveCategory');
    addLog('saveCategory', 'SUCCESS', category.id);
  },

  async deleteCategory(id: string) {
    addLog('API_START_deleteCategory', 'INFO', { id });
    const { error, data } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw handleSupabaseError(error, 'deleteCategory');
    if (!data || data.length === 0) throw new Error(`A categoria não foi encontrada.`);
    addLog('deleteCategory', 'SUCCESS', data);
    return data;
  }
};
