import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useFlatStore } from './flatStore';

export interface ShoppingItem {
  id: string;
  flat_id: string;
  title: string;
  is_completed: boolean;
  added_by: string;
  created_at: string;
}

interface ShoppingState {
  items: ShoppingItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (title: string) => Promise<boolean>;
  toggleItemStatus: (id: string, currentStatus: boolean) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    const flat = useFlatStore.getState().currentFlat;
    if (!flat) return;

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('flat_id', flat.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ items: data as ShoppingItem[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addItem: async (title: string) => {
    const flat = useFlatStore.getState().currentFlat;
    const user = useAuthStore.getState().user;
    if (!flat || !user || !title.trim()) return false;

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('shopping_items')
        .insert([{
          flat_id: flat.id,
          added_by: user.id,
          title: title.trim(),
          is_completed: false
        }]);

      if (error) throw error;
      
      await get().fetchItems();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  toggleItemStatus: async (id: string, currentStatus: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      set(state => ({
        items: state.items.map(item => 
          item.id === id ? { ...item, is_completed: !currentStatus } : item
        ),
        isLoading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  deleteItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      set(state => ({
        items: state.items.filter(item => item.id !== id),
        isLoading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  }
}));
