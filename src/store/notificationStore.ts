import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useFlatStore } from './flatStore';

export type NotificationModule = 'expenses' | 'shopping' | 'chores' | 'chat';

interface NotificationState {
  expensesCount: number;
  expensesZakupyCount: number;
  expensesRachunkiCount: number;
  expensesInneCount: number;
  shoppingCount: number;
  shoppingHasNew: boolean;
  choresCount: number;
  choresHasNew: boolean;
  chatUnreadCount: number;
  chatHasNew: boolean;
  isLoading: boolean;
  fetchCounts: () => Promise<void>;
  markAsSeen: (type: NotificationModule) => Promise<void>;
  markAllModulesSeen: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  expensesCount: 0,
  expensesZakupyCount: 0,
  expensesRachunkiCount: 0,
  expensesInneCount: 0,
  shoppingCount: 0,
  shoppingHasNew: false,
  choresCount: 0,
  choresHasNew: false,
  chatUnreadCount: 0,
  chatHasNew: false,
  isLoading: false,

  fetchCounts: async () => {
    const user = useAuthStore.getState().user;
    const currentFlat = useFlatStore.getState().currentFlat;

    if (!user || !currentFlat) {
      set({
        expensesCount: 0,
        shoppingCount: 0,
        shoppingHasNew: false,
        choresCount: 0,
        choresHasNew: false,
        chatUnreadCount: 0,
        chatHasNew: false,
      });
      return;
    }

    set({ isLoading: true });
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('flat_members')
        .select('last_seen_expenses, last_seen_shopping, last_seen_chores, last_seen_chat')
        .eq('flat_id', currentFlat.id)
        .eq('user_id', user.id)
        .single();

      if (memberError) throw memberError;

      const lastSeenExpenses = memberData.last_seen_expenses || new Date(0).toISOString();
      const lastSeenShopping = memberData.last_seen_shopping || new Date(0).toISOString();
      const lastSeenChores = memberData.last_seen_chores || new Date(0).toISOString();
      const lastSeenChat = memberData.last_seen_chat || new Date(0).toISOString();

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
          .eq('expense_type', 'Inne'),
      ]);

      if (zakupyRes.error) throw zakupyRes.error;
      if (rachunkiRes.error) throw rachunkiRes.error;
      if (inneRes.error) throw inneRes.error;

      const { count: totalUnchecked, error: totalUncheckedError } = await supabase
        .from('shopping_items')
        .select('*', { count: 'exact', head: true })
        .eq('flat_id', currentFlat.id)
        .eq('is_completed', false);
      if (totalUncheckedError) throw totalUncheckedError;

      const { count: newUncheckedCount, error: newUncheckedError } = await supabase
        .from('shopping_items')
        .select('*', { count: 'exact', head: true })
        .eq('flat_id', currentFlat.id)
        .eq('is_completed', false)
        .neq('added_by', user.id)
        .gt('created_at', lastSeenShopping);

      if (newUncheckedError) throw newUncheckedError;

      const { count: totalPendingChores, error: pendingChoresError } = await supabase
        .from('chores')
        .select('*', { count: 'exact', head: true })
        .eq('flat_id', currentFlat.id)
        .in('status', ['todo', 'in_progress']);
      if (pendingChoresError) throw pendingChoresError;

      const { count: newChoresCount, error: newChoresError } = await supabase
        .from('chores')
        .select('*', { count: 'exact', head: true })
        .eq('flat_id', currentFlat.id)
        .in('status', ['todo', 'in_progress'])
        .gt('created_at', lastSeenChores)
        .or(`created_by.is.null,created_by.neq.${user.id}`);

      if (newChoresError) throw newChoresError;

      const { count: unreadChatCount, error: unreadChatError } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('flat_id', currentFlat.id)
        .neq('sender_id', user.id)
        .gt('created_at', lastSeenChat);

      if (unreadChatError) throw unreadChatError;

      set({
        expensesZakupyCount: zakupyRes.count || 0,
        expensesRachunkiCount: rachunkiRes.count || 0,
        expensesInneCount: inneRes.count || 0,
        expensesCount: (zakupyRes.count || 0) + (rachunkiRes.count || 0) + (inneRes.count || 0),
        shoppingCount: totalUnchecked || 0,
        shoppingHasNew: (newUncheckedCount || 0) > 0,
        choresCount: totalPendingChores || 0,
        choresHasNew: (newChoresCount || 0) > 0,
        chatUnreadCount: unreadChatCount || 0,
        chatHasNew: (unreadChatCount || 0) > 0,
        isLoading: false,
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

    const fieldMap: Record<NotificationModule, string> = {
      expenses: 'last_seen_expenses',
      shopping: 'last_seen_shopping',
      chores: 'last_seen_chores',
      chat: 'last_seen_chat',
    };

    try {
      const { error } = await supabase
        .from('flat_members')
        .update({ [fieldMap[type]]: new Date().toISOString() })
        .eq('flat_id', currentFlat.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await get().fetchCounts();
    } catch (err) {
      console.error(`Error marking ${type} as seen:`, err);
    }
  },

  markAllModulesSeen: async () => {
    const user = useAuthStore.getState().user;
    const currentFlat = useFlatStore.getState().currentFlat;

    if (!user || !currentFlat) return;

    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('flat_members')
        .update({
          last_seen_expenses: now,
          last_seen_shopping: now,
          last_seen_chores: now,
          last_seen_chat: now,
        })
        .eq('flat_id', currentFlat.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await get().fetchCounts();
    } catch (err) {
      console.error('Error marking all modules as seen:', err);
    }
  },
}));
