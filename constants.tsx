
import React from 'react';
import { Category, User } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Eletrônicos', color: 'bg-blue-500' },
  { id: 'cat-2', name: 'Moda', color: 'bg-pink-500' },
  { id: 'cat-3', name: 'Casa', color: 'bg-green-500' },
  { id: 'cat-4', name: 'Games', color: 'bg-purple-500' },
  { id: 'cat-5', name: 'Beleza', color: 'bg-rose-500' },
];

export const MOCK_ADMIN: User = {
  id: 'admin-1',
  name: 'Admin PromoShare',
  email: 'admin@promoshare.com',
  role: 'ADMIN',
  avatar: 'https://picsum.photos/seed/admin/200'
};

export const MOCK_USER: User = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@example.com',
  role: 'USER',
  avatar: 'https://picsum.photos/seed/joao/200'
};
