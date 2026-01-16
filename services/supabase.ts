
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
  ownerId: 'system', 
  content: '', 
  targetGroupIds: [], 
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
    
    const result = mapPromoFromDB(data);
    // Preservar targetGroupIds que só existem na UI/Webhook
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
    
    // Verificação Crítica: HTTPS bloqueia chamadas HTTP (Mixed Content)
    const isHttps = window.location.protocol === 'https:';
    if (isHttps && WEBHOOK_URL.startsWith('http://')) {
      const errorMsg = 'BLOQUEIO DE NAVEGADOR: O site está em HTTPS e o Webhook em HTTP. O navegador bloqueia essa chamada por segurança (Mixed Content). Use ngrok ou um tunnel com HTTPS.';
      addLog('sendToWebhook', 'ERROR', errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Truque: Enviar como text/plain evita o preflight de CORS (OPTIONS request) 
      // na maioria dos navegadores, pois é considerado um "Simple Request".
      // O n8n geralmente consegue processar o corpo se for um JSON válido.
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // Tenta enviar sem exigir cabeçalhos CORS (porém não permite ler a resposta)
        headers: { 
          'Content-Type': 'text/plain' 
        },
        body: JSON.stringify({
          id: promo.id,
          title: promo.title,
          price: promo.price,
          link: promo.link,
          cupom: promo.coupon,
          image_url: promo.imageUrl,
          category: promo.mainCategoryId,
          target_groups: promo.targetGroupIds,
          timestamp: new Date().toISOString(),
          app: 'PromoShare'
        })
      });

      // Se mode for 'no-cors', a resposta virá opaca e response.ok será false/status 0
      // Mas o dado CHEGA no n8n.
      addLog('sendToWebhook', 'SUCCESS', 'Solicitação enviada (modo silencioso/no-cors)');
      return true;
    } catch (error: any) {
      addLog('sendToWebhook', 'ERROR', error.message || error);
      
      if (error.message === 'Failed to fetch') {
        throw new Error('Falha de Rede: Verifique se o n8n está acessível e se você habilitou CORS nas opções do nó de Webhook do n8n (Add Option -> Response Headers -> Access-Control-Allow-Origin: *).');
      }
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
