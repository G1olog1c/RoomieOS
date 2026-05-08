import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useFlatStore } from './flatStore';

export type ChoreStatus = 'todo' | 'in_progress' | 'done';

export interface Chore {
  id: string;
  flat_id: string;
  title: string;
  assigned_to: string | null;
  created_by: string | null;
  status: ChoreStatus;
  due_date: string | null;
  created_at: string;
}

interface ChoreState {
  chores: Chore[];
  isLoading: boolean;
  error: string | null;
  fetchChores: () => Promise<void>;
  addChore: (title: string, assignedTo: string | null, dueDate: string | null) => Promise<boolean>;
  updateStatus: (id: string, status: ChoreStatus) => Promise<boolean>;
  updateAssignee: (id: string, assignedTo: string | null) => Promise<boolean>;
  updateDueDate: (id: string, dueDate: string | null) => Promise<boolean>;
  deleteChore: (id: string) => Promise<boolean>;
}

export const useChoreStore = create<ChoreState>((set, get) => ({
  chores: [],
  isLoading: false,
  error: null,

  fetchChores: async () => {
    const flat = useFlatStore.getState().currentFlat;
    if (!flat) return;

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('flat_id', flat.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ chores: (data || []) as Chore[], isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Błąd pobierania harmonogramu';
      set({ error: message, isLoading: false });
    }
  },

  addChore: async (title, assignedTo, dueDate) => {
    const flat = useFlatStore.getState().currentFlat;
    if (!flat || !title.trim()) return false;

    set({ isLoading: true, error: null });
    try {
      const uid = useAuthStore.getState().user?.id ?? null;
      const { error } = await supabase.from('chores').insert([
        {
          flat_id: flat.id,
          title: title.trim(),
          assigned_to: assignedTo || null,
          created_by: uid,
          due_date: dueDate || null,
          status: 'todo' as ChoreStatus,
        },
      ]);

      if (error) throw error;
      await get().fetchChores();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Błąd dodawania zadania';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  updateStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('chores').update({ status }).eq('id', id);
      if (error) throw error;
      set((state) => ({
        chores: state.chores.map((c) => (c.id === id ? { ...c, status } : c)),
        isLoading: false,
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Błąd aktualizacji statusu';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  updateAssignee: async (id, assignedTo) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('chores')
        .update({ assigned_to: assignedTo })
        .eq('id', id);
      if (error) throw error;
      set((state) => ({
        chores: state.chores.map((c) => (c.id === id ? { ...c, assigned_to: assignedTo } : c)),
        isLoading: false,
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Błąd przypisania';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  updateDueDate: async (id, dueDate) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('chores').update({ due_date: dueDate }).eq('id', id);
      if (error) throw error;
      set((state) => ({
        chores: state.chores.map((c) => (c.id === id ? { ...c, due_date: dueDate } : c)),
        isLoading: false,
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Błąd terminu';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deleteChore: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('chores').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        chores: state.chores.filter((c) => c.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Błąd usuwania';
      set({ error: message, isLoading: false });
      return false;
    }
  },
}));
