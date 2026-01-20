
export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type Platform = 'TELEGRAM' | 'WHATSAPP';

export type PromoStatus = 'DRAFT' | 'SCHEDULED' | 'SENT';

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
}

export interface Group {
  id: string;
  name: string;
  platform: Platform;
  apiIdentifier: string;
  categories: string[]; // Category IDs
  ownerId: string;
  createdAt?: string;
}

export interface Promotion {
  id: string;
  title: string;
  price: number;
  link: string;
  coupon?: string;
  imageUrl: string;
  mainCategoryId: string | null;
  secondaryCategoryIds: string[];
  status: PromoStatus;
  scheduledAt?: string;
  sentAt?: string;
  ownerId: string;
  content?: string; // Formatted message
  targetGroupIds: string[];
  createdAt?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  triggerCategory: string;
  targetGroupIds: string[];
  condition?: {
    field: 'price' | 'title';
    operator: 'less_than' | 'contains';
    value: any;
  };
  isActive: boolean;
  ownerId: string;
}

export interface AppState {
  user: User | null;
  promotions: Promotion[];
  groups: Group[];
  categories: Category[];
  rules: AutomationRule[];
}
