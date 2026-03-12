import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useFlatStore } from './flatStore';

export interface Expense {
  id: string;
  flat_id: string;
  payer_id: string;
  amount: number;
  title: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_paid: boolean;
  created_at: string;
}

interface ExpenseState {
  expenses: Expense[];
  splits: ExpenseSplit[];
  isLoading: boolean;
  error: string | null;
  fetchExpenses: () => Promise<void>;
  addExpense: (title: string, amount: number, splitWithIds: string[]) => Promise<boolean>;
  settleDebt: (splitId: string) => Promise<boolean>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  splits: [],
  isLoading: false,
  error: null,

  fetchExpenses: async () => {
    const flat = useFlatStore.getState().currentFlat;
    if (!flat) return;

    set({ isLoading: true, error: null });
    try {
      const { data: expData, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .eq('flat_id', flat.id)
        .order('created_at', { ascending: false });
      
      if (expError) throw expError;

      const expenseIds = expData.map((e: any) => e.id);
      let finalSplits: any[] = [];
      
      if (expenseIds.length > 0) {
        const { data: sData, error: sErr } = await supabase
            .from('expense_splits')
            .select('*')
            .in('expense_id', expenseIds);
            
        if (sErr) throw sErr;
        finalSplits = sData;
      }
      
      set({ expenses: expData as Expense[], splits: finalSplits as ExpenseSplit[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addExpense: async (title, amount, splitWithIds) => {
    const flat = useFlatStore.getState().currentFlat;
    const user = useAuthStore.getState().user;
    if (!flat || !user) return false;

    set({ isLoading: true, error: null });
    try {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          flat_id: flat.id,
          payer_id: user.id,
          amount: amount,
          title: title
        }])
        .select()
        .single();

      if (expenseError) throw expenseError;

      const perPersonAmount = parseFloat((amount / splitWithIds.length).toFixed(2));
      const splits = splitWithIds.map(userId => ({
        expense_id: expenseData.id,
        user_id: userId,
        amount: perPersonAmount,
        is_paid: userId === user.id
      }));

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits);

      if (splitsError) throw splitsError;

      await get().fetchExpenses();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  settleDebt: async (splitId) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('expense_splits')
        .update({ is_paid: true })
        .eq('id', splitId);
        
      if (error) throw error;
      
      await get().fetchExpenses();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  }
}));
