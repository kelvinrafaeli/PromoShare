
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
  console.error(`Error in ${method}:`, error);
  const message = error.message || 'Erro inesperado no Supabase';
  const friendlyMessage = error.code === 'PGRST204'
    ? 'Erro de compatibilidade com o banco de dados (coluna não encontrada).'
    : message;

  addLog(method, 'ERROR', { ...error, friendlyMessage });
  return new Error(friendlyMessage);
};

// Mapeamento exato com a sua tabela 'offers'
const mapPromoFromDB = (p: any): Promotion => ({
  id: p.id.toString(),
  title: p.title || '',
  price: parseFloat(p.price) || 0,
  link: p.link || '',
  coupon: p.cupom || '',           // Mapeia coluna 'cupom'
  imageUrl: p.image_url || '',     // Mapeia coluna 'image_url'
  mainCategoryId: p.category || '', // Mapeia coluna 'category'
  secondaryCategoryIds: [],
  status: 'SENT',
  createdAt: p.created_at,
  ownerId: p.owner_id || 'system', // Mantém leitura com fallback, caso a coluna seja criada futuramente
  targetGroupIds: []
});

const mapPromoToDB = (p: Promotion) => {
  const base: any = {
    title: p.title,
    price: p.price,
    link: p.link,
    cupom: p.coupon,           // Grava na coluna 'cupom'
    image_url: p.imageUrl,     // Grava na coluna 'image_url'
    category: p.mainCategoryId, // Grava na coluna 'category'
    // REMOVIDO owner_id: A coluna não existe na tabela 'offers' atual do banco de dados
    // owner_id: p.ownerId || 'system' 
  };
  // Se for uma promoção existente, incluímos o ID para o upsert funcionar como atualização
  if (p.id && !p.id.startsWith('temp-')) {
    base.id = p.id;
  }
  return base;
};

export const api = {
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Credenciais inválidas.');
    return {
      id: data.user.id,
      name: data.user.email?.split('@')[0] || 'Usuário',
      email: data.user.email || '',
      role: 'USER'
    };
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async fetchAll() {
    // Busca todas as entidades em paralelo para eficiência
    const [offersRes, groupsRes, categoriesRes] = await Promise.all([
      supabase.from('offers').select('*').order('created_at', { ascending: false }),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('created_at', { ascending: false })
    ]);

    if (offersRes.error) throw handleSupabaseError(offersRes.error, 'fetchOffers');

    // Tratamento de buscas opcionais (lidando graciosamente se as tabelas ainda não existirem)
    const promotions = (offersRes.data || []).map(mapPromoFromDB);
    const groups = (groupsRes.data || []).map((g: any) => ({
      id: g.id.toString(),
      name: g.name,
      platform: g.platform,
      apiIdentifier: g.api_identifier,
      categories: g.categories || [],
      ownerId: g.owner_id,
      createdAt: g.created_at
    }));
    const categories = (categoriesRes.data || []).map((c: any) => ({
      id: c.id.toString(),
      name: c.name,
      color: c.color,
      createdAt: c.created_at
    }));

    return {
      promotions,
      groups,
      categories
    };
  },

  /**
   * PASSO 1: Salva o arquivo no bucket e retorna a URL pública
   */
  async uploadImage(file: File): Promise<string> {
    addLog('uploadImage', 'INFO', { file: file.name });

    // Gera um nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload para o bucket 'promo-images'
    const { error: uploadError } = await supabase.storage
      .from('promo-images')
      .upload(fileName, file);

    if (uploadError) throw handleSupabaseError(uploadError, 'uploadImage');

    // Gera a URL pública
    const { data } = supabase.storage
      .from('promo-images')
      .getPublicUrl(fileName);

    if (!data?.publicUrl) throw new Error('Não foi possível gerar a URL da imagem.');

    addLog('uploadImage', 'SUCCESS', data.publicUrl);
    return data.publicUrl;
  },

  /**
   * PASSO 2: Salva os dados na tabela 'offers' incluindo a 'image_url'
   */
  async savePromotion(promo: Promotion, allGroups: Group[] = []): Promise<Promotion> {
    addLog('savePromotion', 'INFO', { title: promo.title });

    const payload = mapPromoToDB(promo);
    const { data, error } = await supabase
      .from('offers')
      .upsert(payload)
      .select()
      .single();

    if (error) throw handleSupabaseError(error, 'savePromotion');

    addLog('savePromotion', 'SUCCESS', data.id);

    // Disparar Webhook
    try {
      const webhookPayload = mapPromoFromDB(data);
      // Garantir que os grupos selecionados sejam enviados, pois não estão na tabela 'offers' do banco, mas estão no objeto local
      webhookPayload.targetGroupIds = promo.targetGroupIds;

      addLog('triggerWebhook', 'INFO', { url: 'https://76.13.66.108.sslip.io/webhook/promoshare' });

      await fetch('https://76.13.66.108.sslip.io/webhook/promoshare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'a3f9c2e87b4d1a6e9f0c5b72e4d8a1c3f6b0e9d7a2c4f8b5e1d6a9c0b7e4f2'
        },
        body: JSON.stringify({
          id: data.id,
          title: promo.title,
          price: promo.price,
          link: promo.link,
          cupom: promo.coupon || null,
          image_url: promo.imageUrl,
          category: null,
          target_groups: promo.targetGroupIds
            .map(gid => allGroups.find(g => g.id === gid)?.apiIdentifier)
            .filter(Boolean),
          target_details: promo.targetGroupIds
            .map(gid => {
              const g = allGroups.find(g => g.id === gid);
              return g ? {
                api_identifier: g.apiIdentifier,
                name: g.name,
                platform: g.platform
              } : null;
            })
            .filter(Boolean),
          timestamp: new Date().toISOString(),
          app: "PromoShare"
        })
      });

      addLog('triggerWebhook', 'SUCCESS', 'Webhook enviado com sucesso');
    } catch (webhookError: any) {
      console.error('Erro ao enviar webhook:', webhookError);
      addLog('triggerWebhook', 'ERROR', webhookError.message);
      // Não lançamos erro aqui para não impedir o fluxo principal de salvamento
    }

    return mapPromoFromDB(data);
  },

  async deletePromotion(id: string) {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) throw handleSupabaseError(error, 'deletePromotion');
  },

  // Correção para erro no GroupsPage: Adicionando o método saveGroup
  async saveGroup(group: Group): Promise<Group> {
    addLog('saveGroup', 'INFO', { name: group.name });
    const payload: any = {
      name: group.name,
      platform: group.platform,
      api_identifier: group.apiIdentifier,
      categories: group.categories,
      owner_id: group.ownerId
    };

    // Inclui o ID se for uma atualização
    if (group.id && !group.id.includes('temp')) {
      payload.id = group.id;
    }

    const { data, error } = await supabase
      .from('groups')
      .upsert(payload)
      .select()
      .single();

    if (error) throw handleSupabaseError(error, 'saveGroup');
    addLog('saveGroup', 'SUCCESS', data.id);
    return {
      id: data.id.toString(),
      name: data.name,
      platform: data.platform,
      apiIdentifier: data.api_identifier,
      categories: data.categories || [],
      ownerId: data.owner_id,
      createdAt: data.created_at
    };
  },

  // Correção para erro no GroupsPage: Adicionando o método deleteGroup
  async deleteGroup(id: string) {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw handleSupabaseError(error, 'deleteGroup');
  },

  // Correção para erro no CategoriesPage: Adicionando o método saveCategory
  async saveCategory(cat: Category): Promise<Category> {
    addLog('saveCategory', 'INFO', { name: cat.name });
    const payload: any = {
      name: cat.name,
      color: cat.color
    };

    // Inclui o ID se for uma atualização
    if (cat.id && !cat.id.includes('temp')) {
      payload.id = cat.id;
    }

    const { data, error } = await supabase
      .from('categories')
      .upsert(payload)
      .select()
      .single();

    if (error) throw handleSupabaseError(error, 'saveCategory');
    addLog('saveCategory', 'SUCCESS', data.id);
    return {
      id: data.id.toString(),
      name: data.name,
      color: data.color,
      createdAt: data.created_at
    };
  },

  // Correção para erro no CategoriesPage: Adicionando o método deleteCategory
  async deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw handleSupabaseError(error, 'deleteCategory');
  }
};
