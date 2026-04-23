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
  expense_type?: string | null;
  source_expense_ids?: string[] | null;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_paid: boolean;
  note?: string;
  created_at: string;
}

interface ExpenseState {
  expenses: Expense[];
  splits: ExpenseSplit[];
  isLoading: boolean;
  error: string | null;
  fetchExpenses: () => Promise<void>;
  addExpense: (title: string, amount: number, splitWithIds: string[], expenseType: 'Zakupy' | 'Rachunki' | 'Inne') => Promise<boolean>;
  settleDebt: (splitId: string, note?: string) => Promise<boolean>;
  deleteExpense: (expenseId: string) => Promise<boolean>;
  calculateOptimalDebts: () => { from: string; to: string; amount: number }[];
  simplifyDebts: (opts?: { settleNewDebts?: boolean; settleNote?: string }) => Promise<{
    insertedDebts: { expenseId: string; splitId: string; from: string; to: string; amount: number }[];
    sourceExpenseIds: string[];
  } | false>;
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

  addExpense: async (title, amount, splitWithIds, expenseType) => {
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
          title: title,
          expense_type: expenseType
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

  settleDebt: async (splitId, note) => {
    set({ isLoading: true, error: null });
    try {
      const updateData: any = { is_paid: true };
      if (note) updateData.note = note;

      const { error } = await supabase
        .from('expense_splits')
        .update(updateData)
        .eq('id', splitId);
        
      if (error) throw error;
      
      await get().fetchExpenses();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  deleteExpense: async (expenseId) => {
    set({ isLoading: true, error: null });
    try {
      // Delete all splits for this expense first
      const { error: splitsError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId);

      if (splitsError) throw splitsError;

      // Delete the expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (expenseError) throw expenseError;

      await get().fetchExpenses();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  calculateOptimalDebts: () => {
    const { expenses, splits } = get();
    // 1. Calculate net balances for each user
    const balances: Record<string, number> = {};
    
    // Only consider UNPAID splits where user_id != payer_id
    const unresolvedSplits = splits.filter(s => !s.is_paid);
    
    for (const split of unresolvedSplits) {
        const expense = expenses.find(e => e.id === split.expense_id);
        if (!expense) continue;
        if (expense.payer_id === split.user_id) continue;
        
        // payer gets money back (+), split user owes money (-)
        balances[expense.payer_id] = (balances[expense.payer_id] || 0) + split.amount;
        balances[split.user_id] = (balances[split.user_id] || 0) - split.amount;
    }

    // 2. Separate into debtors and creditors
    const debtors = Object.entries(balances)
      .filter(([_, amount]) => amount < -0.01)
      .map(([userId, amount]) => ({ userId, amount: amount }));
      
    const creditors = Object.entries(balances)
      .filter(([_, amount]) => amount > 0.01)
      .map(([userId, amount]) => ({ userId, amount: amount }));

    // 3. Greedily match them up
    let i = 0;
    let j = 0;
    const optimalTransactions: { from: string; to: string; amount: number }[] = [];

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        
        let settleAmount = Math.min(Math.abs(debtor.amount), creditor.amount);
        settleAmount = parseFloat(settleAmount.toFixed(2));
        
        if (settleAmount > 0) {
            optimalTransactions.push({
                from: debtor.userId,
                to: creditor.userId,
                amount: settleAmount
            });
        }
        
        debtor.amount += settleAmount;
        creditor.amount -= settleAmount;
        
        if (Math.abs(debtor.amount) < 0.01) i++;
        if (Math.abs(creditor.amount) < 0.01) j++;
    }

    return optimalTransactions;
  },

  simplifyDebts: async (opts) => {
      const flat = useFlatStore.getState().currentFlat;
      if (!flat) return false;
      
      set({ isLoading: true, error: null });
      try {
          const optimal = get().calculateOptimalDebts();
          const { splits } = get();
          const unpaidSplits = splits.filter(s => !s.is_paid);
          const unresolvedOldSplitIds = unpaidSplits.map(s => s.id);
          const sourceExpenseIds = Array.from(new Set(unpaidSplits.map(s => s.expense_id)));

          // 1. Mark existing unpaid splits as paid (resolved by smart settlement)
          const unpaidDivIds = unresolvedOldSplitIds;
          
          if (unpaidDivIds.length > 0) {
              const { error: markError } = await supabase
                  .from('expense_splits')
                  .update({ 
                      is_paid: true, 
                      note: 'Rozliczone automatycznie (Smart Settlement)' 
                  })
                  .in('id', unpaidDivIds);
                  
              if (markError) throw markError;
          }

          if (optimal.length === 0) {
              await get().fetchExpenses();
              return { insertedDebts: [], sourceExpenseIds };
          }

          // 2. Insert new consolidated expenses and splits
          // Each optimal transaction is conceptually: Debtor pays Creditor
          // To map this to Expenses: Creditor is the 'payer' (they are owed money)
          // Debtor is the one with the 'split'
          const insertedDebts: { expenseId: string; splitId: string; from: string; to: string; amount: number }[] = [];
          for (const transaction of optimal) {
              const { data: expData, error: expError } = await supabase
                  .from('expenses')
                  .insert([{
                      flat_id: flat.id,
                      payer_id: transaction.to, // the person receiving money
                      amount: transaction.amount,
                      title: 'Uproszczenie Długów',
                      expense_type: 'Inne',
                      source_expense_ids: sourceExpenseIds
                  }])
                  .select()
                  .single();
                  
              if (expError) throw expError;

              const { data: splitData, error: splitError } = await supabase
                  .from('expense_splits')
                  .insert([{
                      expense_id: expData.id,
                      user_id: transaction.from, // the person who owes
                      amount: transaction.amount,
                      is_paid: false,
                      note: 'Wynik Smart Settlement'
                  }])
                  .select()
                  .single();
                  
              if (splitError) throw splitError;

              insertedDebts.push({
                expenseId: expData.id,
                splitId: splitData.id,
                from: transaction.from,
                to: transaction.to,
                amount: transaction.amount
              });
          }

          // Optional: immediately mark the newly inserted debts as paid.
          if (opts?.settleNewDebts && insertedDebts.length > 0) {
            const idsToSettle = insertedDebts.map(d => d.splitId);
            const note = opts.settleNote || 'Zapłacone (Smart Settlement)';
            const { error: settleError } = await supabase
              .from('expense_splits')
              .update({ is_paid: true, note })
              .in('id', idsToSettle);
            if (settleError) throw settleError;
          }

          await get().fetchExpenses();
          return { insertedDebts, sourceExpenseIds };
      } catch(err: any) {
          console.error(err);
          set({ error: err.message, isLoading: false });
          return false;
      }
  }
}));
