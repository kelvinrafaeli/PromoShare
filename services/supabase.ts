
import { createClient } from '@supabase/supabase-js';
import { Promotion, Group, Category, User } from '../types';

const supabaseUrl = 'https://behdyuplqoxgdbujzkob.supabase.co';
const supabaseKey = 'sb_publishable_OHdZ5yIbqvoowxDpmIEYqQ_xNzoMIB7';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
    ? `Erro de Permissão (RLS): Verifique as políticas da tabela 'offers' no Supabase.`
    : error.message || 'Erro desconhecido no servidor';
  
  addLog(method, 'ERROR', { ...error, friendlyMessage: message });
  return new Error(message);
};

// --- Mappers para a tabela PUBLIC.OFFERS ---

const mapPromoFromDB = (p: any): Promotion => ({
  id: p.id.toString(),
  title: p.title || '',
  price: parseFloat(p.price) || 0,
  link: p.link || '',
  coupon: p.cupom || '',
  imageUrl: p.image_url || 'https://picsum.photos/400/300',
  mainCategoryId: p.category || '',
  secondaryCategoryIds: [],
  status: 'SENT',
  scheduledAt: p.created_at,
  sentAt: p.created_at,
  ownerId: 'system', // Forçado como system pois a coluna owner_id não existe no banco
  content: '', 
  targetGroupIds: [], // Coluna inexistente no banco, gerida em memória/webhook
  createdAt: p.created_at
});

const mapPromoToDB = (p: Promotion) => {
  const payload: any = {
    title: p.title,
    price: p.price,
    link: p.link,
    cupom: p.coupon,
    image_url: p.imageUrl,
    category: p.mainCategoryId
    // Removidas colunas owner_id e target_group_ids que causaram erro PGRST204
  };

  const numericId = Number(p.id);
  if (!isNaN(numericId) && !p.id.toString().startsWith('temp-')) {
    payload.id = numericId;
  }
  
  return payload;
};

export const api = {
  async login(email: string, password: string): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw new Error('E-mail ou senha inválidos.');

    const { data: profile } = await supabase.from('users').select('*').eq('email', email).single();

    return {
      id: authData.user.id,
      name: profile?.name || authData.user.email?.split('@')[0] || 'Usuário',
      email: authData.user.email || '',
      role: profile?.role || 'USER',
      avatar: profile?.avatar || `https://ui-avatars.com/api/?name=User`
    };
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async fetchAll() {
    addLog('fetchAll', 'INFO', 'Buscando dados das tabelas...');
    const [promos, groups, cats] = await Promise.all([
      supabase.from('offers').select('*').order('created_at', { ascending: false }),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true })
    ]);

    if (promos.error) handleSupabaseError(promos.error, 'fetchOffers');

    return {
      promotions: (promos.data || []).map(mapPromoFromDB),
      groups: (groups.data || []).map(g => ({
        id: g.id,
        name: g.name,
        platform: g.platform,
        apiIdentifier: g.api_identifier,
        categories: g.categories || [],
        ownerId: g.owner_id || 'system',
        createdAt: g.created_at
      })),
      categories: (cats.data || []) as Category[]
    };
  },

  async savePromotion(promo: Promotion): Promise<Promotion> {
    addLog('savePromotion', 'INFO', { title: promo.title });
    const { data, error } = await supabase
      .from('offers')
      .upsert(mapPromoToDB(promo))
      .select()
      .single();

    if (error) throw handleSupabaseError(error, 'savePromotion');
    addLog('savePromotion', 'SUCCESS', 'Promoção salva com sucesso');
    
    // Retornamos o objeto mapeado mas garantimos que o targetGroupIds 
    // selecionado pelo usuário no UI persista para o próximo passo (webhook)
    const result = mapPromoFromDB(data);
    result.targetGroupIds = promo.targetGroupIds;
    return result;
  },

  async deletePromotion(id: string) {
    const numericId = Number(id);
    if (isNaN(numericId)) throw new Error('ID inválido para exclusão.');
    const { error } = await supabase.from('offers').delete().eq('id', numericId);
    if (error) throw handleSupabaseError(error, 'deletePromotion');
    addLog('deletePromotion', 'SUCCESS', id);
  },

  async sendToWebhook(promo: Promotion) {
    const WEBHOOK_URL = 'http://76.13.66.108:5678/webhook/promoshare';
    addLog('sendToWebhook', 'INFO', { promoId: promo.id, url: WEBHOOK_URL });
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...promo,
          event: 'promotion_sent',
          sent_at_webhook: new Date().toISOString(),
          app_source: 'PromoShare Web',
          target_groups: promo.targetGroupIds
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText || 'Sem resposta do servidor'}`);
      }
      
      addLog('sendToWebhook', 'SUCCESS', 'Dados enviados para o webhook com sucesso');
      return true;
    } catch (error: any) {
      addLog('sendToWebhook', 'ERROR', error.message || error);
      throw error;
    }
  },

  async saveGroup(group: Group) {
    const { error } = await supabase.from('groups').upsert({
      id: group.id,
      name: group.name,
      platform: group.platform,
      api_identifier: group.apiIdentifier,
      categories: group.categories,
      owner_id: group.ownerId
    });
    if (error) throw handleSupabaseError(error, 'saveGroup');
  },

  async deleteGroup(id: string) {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw handleSupabaseError(error, 'deleteGroup');
  },

  async saveCategory(category: Category) {
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      color: category.color
    }); 
    if (error) throw handleSupabaseError(error, 'saveCategory');
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw handleSupabaseError(error, 'deleteCategory');
  }
};
