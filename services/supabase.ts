
import { createClient } from '@supabase/supabase-js';
import { Promotion, Group, Category, User } from '../types';

/*
  === ESQUEMA DO BANCO DE DADOS (SUPABASE SQL) ===
  
  -- Tabela de Usuários (Nova)
  CREATE TABLE public.users (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      password text NOT NULL,
      role text DEFAULT 'USER',
      avatar text,
      created_at timestamp with time zone DEFAULT now()
  );

  -- Tabelas Existentes
  public.promotions, public.groups, public.categories
*/

const supabaseUrl = 'https://behdyuplqoxgdbujzkob.supabase.co';
const supabaseKey = 'sb_publishable_OHdZ5yIbqvoowxDpmIEYqQ_xNzoMIB7';

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- Mappers (DB snake_case <-> App camelCase) ---

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
  // Autenticação usando a tabela 'users' personalizada
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password) // Verifica email e senha
      .single();

    if (error || !data) {
      throw new Error('Credenciais inválidas');
    }

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
      supabase.from('categories').select('*')
    ]);

    if (promos.error) console.error('Erro ao buscar promoções:', promos.error);
    if (groups.error) console.error('Erro ao buscar grupos:', groups.error);
    if (cats.error) console.error('Erro ao buscar categorias:', cats.error);

    return {
      promotions: (promos.data || []).map(mapPromoFromDB),
      groups: (groups.data || []).map(mapGroupFromDB),
      categories: (cats.data || []) as Category[]
    };
  },

  async savePromotion(promo: Promotion) {
    const { error } = await supabase
      .from('promotions')
      .upsert(mapPromoToDB(promo));
    if (error) throw error;
  },

  async deletePromotion(id: string) {
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async saveGroup(group: Group) {
    const { error } = await supabase
      .from('groups')
      .upsert(mapGroupToDB(group));
    if (error) throw error;
  },

  async deleteGroup(id: string) {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async saveCategory(category: Category) {
    const { error } = await supabase
      .from('categories')
      .upsert({
        id: category.id,
        name: category.name,
        color: category.color
      }); 
    if (error) throw error;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
