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
  externalId: p.external_id || undefined,
  title: p.title || '',
  price: parseFloat(p.price) || 0,
  originalPrice: p.original_price ? parseFloat(p.original_price) : undefined,
  link: p.link || '',
  coupon: p.cupom || '',           // Mapeia coluna 'cupom'
  imageUrl: p.image_url || '',     // Mapeia coluna 'image_url'
  mainCategoryId: p.category || '', // Mapeia coluna 'category'
  secondaryCategoryIds: [],
  status: 'SENT',
  createdAt: p.created_at,
  ownerId: p.owner_id || 'system', // Mantém leitura com fallback, caso a coluna seja criada futuramente
  targetGroupIds: [],
  seller: p.seller || undefined,
  freeShipping: p.free_shipping || undefined,
  installment: p.installment || undefined,
  extraInfo: p.extra_info || undefined
});

const mapPromoToDB = (p: Promotion) => {
  const base: any = {
    title: p.title,
    price: p.price,
    original_price: p.originalPrice,
    link: p.link,
    cupom: p.coupon,           // Grava na coluna 'cupom'
    image_url: p.imageUrl,     // Grava na coluna 'image_url'
    category: p.mainCategoryId, // Grava na coluna 'category'
    external_id: p.externalId,
    seller: p.seller,
    free_shipping: p.freeShipping,
    installment: p.installment,
    extra_info: p.extraInfo
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

  async getAutoSendSettings(userEmail: string): Promise<{ enabled: boolean; lastCheckedId: string | null }> {
    const { data, error } = await supabase
      .from('users')
      .select('auto_send_enabled, last_checked_offer_id')
      .eq('email', userEmail)
      .single();

    if (error) throw handleSupabaseError(error, 'getAutoSendSettings');

    return {
      enabled: data?.auto_send_enabled || false,
      lastCheckedId: data?.last_checked_offer_id || null
    };
  },

  async updateAutoSendEnabled(userEmail: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ auto_send_enabled: enabled })
      .eq('email', userEmail);

    if (error) throw handleSupabaseError(error, 'updateAutoSendEnabled');
    addLog('updateAutoSendEnabled', 'SUCCESS', { userEmail, enabled });
  },

  async updateLastCheckedOfferId(userEmail: string, offerId: string | null): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ last_checked_offer_id: offerId })
      .eq('email', userEmail);

    if (error) throw handleSupabaseError(error, 'updateLastCheckedOfferId');
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

    // Disparar Webhook via Backend Seguro
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const promoData = mapPromoFromDB(data);
      const webhookPayload = {
        id: promoData.id,
        title: promoData.title,
        price: promoData.price,
        original_price: promoData.originalPrice,
        link: promoData.link,
        cupom: promoData.coupon,
        image_url: promoData.imageUrl,
        seller: promoData.seller,
        free_shipping: promoData.freeShipping,
        installment: promoData.installment,
        extra_info: promoData.extraInfo,
        category: promoData.mainCategoryId,
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
      };

      addLog('triggerWebhook', 'INFO', { via: 'Python Backend Gateway' });

      await fetch('/api/send-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(webhookPayload)
      });

      addLog('triggerWebhook', 'SUCCESS', 'Pedido de envio processado pelo Backend');
    } catch (webhookError: any) {
      console.error('Erro ao processar webhook via backend:', webhookError);
      addLog('triggerWebhook', 'ERROR', webhookError.message);
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
  },

  async fetchExternalProduct(): Promise<Partial<Promotion>> {
    // Chama diretamente a API externa via proxy do Vite
    const response = await fetch('/external-api/api/products?sitename=thautec&start=0&limit=1');
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const body = await response.json();
    console.log('📦 Resposta da API externa:', body);
    
    if (!body?.data || body.data.length === 0) {
      throw new Error('Nenhum produto encontrado na API externa.');
    }

    const product = body.data[0];
    const attr = product.attributes;

    const parsePrice = (priceStr: string) => {
      if (!priceStr) return 0;
      const cleaned = priceStr.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0;
    };

    return {
      externalId: product.id.toString(),
      title: attr.title,
      price: parsePrice(attr.price),
      originalPrice: parsePrice(attr.price_from),
      link: attr.link,
      coupon: attr.coupon,
      imageUrl: attr.image,
      seller: attr.seller,
      freeShipping: attr.free_shipping,
      installment: attr.installment,
      extraInfo: attr.extraInfo
    };
  }
};
