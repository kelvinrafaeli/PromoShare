
import { createClient } from '@supabase/supabase-js';
import { Promotion, Group, Category, User } from '../types';

const supabaseUrl = 'https://behdyuplqoxgdbujzkob.supabase.co';
const supabaseKey = 'sb_publishable_OHdZ5yIbqvoowxDpmIEYqQ_xNzoMIB7';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) throw new Error('Credenciais inválidas ou erro de conexão.');

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as 'ADMIN' | 'USER',
      avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`
    };
  },

  async fetchAll() {
    const [promos, groups, cats] = await Promise.all([
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true })
    ]);

    return {
      promotions: (promos.data || []).map(mapPromoFromDB),
      groups: (groups.data || []).map(mapGroupFromDB),
      categories: (cats.data || []) as Category[]
    };
  },

  async savePromotion(promo: Promotion) {
    const { error } = await supabase.from('promotions').upsert(mapPromoToDB(promo));
    if (error) throw error;
  },

  async deletePromotion(id: string) {
    console.log('Iniciando exclusão da promoção:', id);
    const { error, data } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)
      .select(); // Força o retorno para confirmar se deletou

    if (error) {
      console.error('Erro Supabase ao deletar promoção:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('Nenhum registro deletado. O ID existe ou a política RLS permite DELETE?');
      throw new Error('O banco de dados não removeu o registro. Verifique as permissões de DELETE no Supabase.');
    }
    
    console.log('Promoção deletada com sucesso:', data);
    return data;
  },

  async saveGroup(group: Group) {
    const { error } = await supabase.from('groups').upsert(mapGroupToDB(group));
    if (error) throw error;
  },

  async deleteGroup(id: string) {
    console.log('Iniciando exclusão do grupo:', id);
    const { error, data } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro Supabase ao deletar grupo:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('O banco de dados não removeu o grupo. Verifique as políticas RLS.');
    }

    return data;
  },

  async saveCategory(category: Category) {
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      color: category.color
    }); 
    if (error) throw error;
  },

  async deleteCategory(id: string) {
    console.log('Iniciando exclusão da categoria:', id);
    const { error, data } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro Supabase ao deletar categoria:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('O banco de dados não removeu a categoria. Verifique se há promoções vinculadas a ela.');
    }

    return data;
  }
};
