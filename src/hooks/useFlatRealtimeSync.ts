import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFlatStore } from '../store/flatStore';
import { useExpenseStore } from '../store/expenseStore';
import { useShoppingStore } from '../store/shoppingStore';
import { useChoreStore } from '../store/choreStore';
import { useNotificationStore } from '../store/notificationStore';

function debounce(fn: () => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
}

/**
 * Jedna subskrypcja Realtime na aktywne mieszkanie: odświeża store’y po zmianach w Supabase,
 * żeby cała aplikacja (pulpit, finanse, zakupy, harmonogram, liczniki) była zsynchronizowana na żywo.
 */
export function useFlatRealtimeSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const flatId = useFlatStore((s) => s.currentFlat?.id);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId || !flatId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const refreshCore = debounce(() => {
      void useExpenseStore.getState().fetchExpenses();
      void useShoppingStore.getState().fetchItems();
      void useChoreStore.getState().fetchChores();
    }, 300);

    const refreshCounts = debounce(() => {
      void useNotificationStore.getState().fetchCounts();
    }, 150);

    const refreshFlatMeta = debounce(() => {
      void useFlatStore.getState().fetchFlat();
    }, 350);

    const onExpensesShoppingChores = () => {
      refreshCore();
      refreshCounts();
    };

    const onSplitChange = (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      const row = (payload.new || payload.old) as { expense_id?: string } | undefined;
      const expenseId = row?.expense_id;
      const expenses = useExpenseStore.getState().expenses;
      if (expenses.length === 0 || !expenseId || expenses.some((e) => e.id === expenseId)) {
        onExpensesShoppingChores();
      }
    };

    const onFlatOrMembers = () => {
      refreshFlatMeta();
      refreshCounts();
    };

    const onChatOnly = () => {
      refreshCounts();
    };

    const channel = supabase
      .channel(`flat-live:${flatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `flat_id=eq.${flatId}` },
        onExpensesShoppingChores
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' }, onSplitChange)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `flat_id=eq.${flatId}` },
        onExpensesShoppingChores
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chores', filter: `flat_id=eq.${flatId}` },
        onExpensesShoppingChores
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `flat_id=eq.${flatId}` },
        onChatOnly
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flat_members', filter: `flat_id=eq.${flatId}` },
        onFlatOrMembers
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flats', filter: `id=eq.${flatId}` },
        onFlatOrMembers
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, flatId]);
}
