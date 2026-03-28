/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vccxlposjyypumbaejsi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjY3hscG9zanl5cHVtYmFlanNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjUwMTgsImV4cCI6MjA5MDMwMTAxOH0.P_PExOyWDj8NqCcni7MnGZprcrpGPEg1ZlALa84Q51Y';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing. Please check your .env file and Settings menu.');
}

// Provide placeholder values to prevent createClient from throwing an error on startup
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Profile = {
  id: string;
  owner_id: string;
  company_name: string;
  cnpj: string;
  phone: string;
  image_url?: string;
  is_blocked: boolean;
  low_stock_threshold?: number;
};

export type Employee = {
  id: string;
  shop_id: string;
  name: string;
  password_hash: string;
};

export type InventoryItem = {
  id: string;
  shop_id: string;
  description: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  created_at: string;
};

export type Customer = {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  vehicle_model: string;
  plate: string;
};

export type ServiceOrder = {
  id: string;
  shop_id: string;
  customer_id: string;
  problem_description: string;
  parts_used: { description: string; price: number; inventory_id?: string }[];
  labor_value: number;
  total_value: number;
  signature_data?: string;
  status: 'pending' | 'completed' | 'delivered';
  payment_method?: 'money' | 'credit_card' | 'debit_card' | 'pix';
  created_at: string;
};

export type Expense = {
  id: string;
  shop_id: string;
  description: string;
  value: number;
  date: string;
  type: 'fixed' | 'variable';
};

export type SupportMessage = {
  id: string;
  from_id: string;
  to_id: string;
  message: string;
  created_at: string;
};
