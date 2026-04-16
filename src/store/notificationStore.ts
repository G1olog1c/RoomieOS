import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useFlatStore } from './flatStore';

interface NotificationState {
  expensesCount: number;
  expensesZakupyCount: number;
  expensesRachunkiCount: number;
  expensesInneCount: number;
  shoppingCount: number;
  shoppingHasNew: boolean;
  isLoading: boolean;
  fetchCounts: () => Promise<void>;
  markAsSeen: (type: 'expenses' | 'shopping') => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  expensesCount: 0,
  expensesZakupyCount: 0,
  expensesRachunkiCount: 0,
  expensesInneCount: 0,
  shoppingCount: 0,
  shoppingHasNew: false,
  isLoading: false,

  fetchCounts: async () => {
    const user = useAuthStore.getState().user;
    const currentFlat = useFlatStore.getState().currentFlat;
    
    if (!user || !currentFlat) {
        set({ expensesCount: 0, shoppingCount: 0, shoppingHasNew: false });
        return;
    }

    set({ isLoading: true });
    try {
      // 1. Get last seen timestamps
      const { data: memberData, error: memberError } = await supabase
        .from('flat_members')
        .select('last_seen_expenses, last_seen_shopping')
        .eq('flat_id', currentFlat.id)
        .eq('user_id', user.id)
        .single();
        
      if (memberError) throw memberError;

      const lastSeenExpenses = memberData.last_seen_expenses || new Date(0).toISOString();
      const lastSeenShopping = memberData.last_seen_shopping || new Date(0).toISOString();

      // 2. Count new expenses by type (where created_at > last_seen_expenses AND payer_id != current_user)
      const [zakupyRes, rachunkiRes, inneRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('flat_id', currentFlat.id)
          .gt('created_at', lastSeenExpenses)
          .eq('expense_type', 'Zakupy'),
        supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('flat_id', currentFlat.id)
          .gt('created_at', lastSeenExpenses)
          .eq('expense_type', 'Rachunki'),
        supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('flat_id', currentFlat.id)
          .gt('created_at', lastSeenExpenses)
          .eq('expense_type', 'Inne')
      ]);

      if (zakupyRes.error) throw zakupyRes.error;
      if (rachunkiRes.error) throw rachunkiRes.error;
      if (inneRes.error) throw inneRes.error;

      // 3. Count ALL unchecked items (shopping badge base count)
      const { count: totalUnchecked, error: totalUncheckedError } = await supabase
        .from('shopping_items')
        .select('*', { count: 'exact', head: true })
        .eq('flat_id', currentFlat.id)
        .eq('is_completed', false)
      if (totalUncheckedError) throw totalUncheckedError;

      // 4. Count NEW unchecked items (unread shopping notifications)
      const { count: newUncheckedCount, error: newUncheckedError } = await supabase
        .from('shopping_items')
        .select('*', { count: 'exact', head: true })
        .eq('flat_id', currentFlat.id)
        .eq('is_completed', false)
        .neq('added_by', user.id) // don't notify about our own shopping items
        .gt('created_at', lastSeenShopping);

      if (newUncheckedError) throw newUncheckedError;

      set({ 
          expensesZakupyCount: zakupyRes.count || 0,
          expensesRachunkiCount: rachunkiRes.count || 0,
          expensesInneCount: inneRes.count || 0,
          expensesCount: (zakupyRes.count || 0) + (rachunkiRes.count || 0) + (inneRes.count || 0),
          shoppingCount: totalUnchecked || 0,
          shoppingHasNew: (newUncheckedCount || 0) > 0,
          isLoading: false
      });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      set({ isLoading: false });
    }
  },

  markAsSeen: async (type) => {
    const user = useAuthStore.getState().user;
    const currentFlat = useFlatStore.getState().currentFlat;
    
    if (!user || !currentFlat) return;

    try {
      const fieldName = type === 'expenses' ? 'last_seen_expenses' : 'last_seen_shopping';
      
      const { error } = await supabase
        .from('flat_members')
        .update({ [fieldName]: new Date().toISOString() })
        .eq('flat_id', currentFlat.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local count assuming it's instantly cleared
      if (type === 'expenses') {
          set({ expensesCount: 0, expensesZakupyCount: 0, expensesRachunkiCount: 0, expensesInneCount: 0 });
      } else {
          // Clear only "new" marker; total unchecked items remain visible.
          set({ shoppingHasNew: false });
      }
    } catch (err) {
      console.error(`Error marking ${type} as seen:`, err);
    }
  }
}));
