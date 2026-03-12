import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

export interface Flat {
  id: string;
  name: string;
  invite_code: string;
}

export interface FlatMember {
  user_id: string;
  role: string;
}

interface FlatState {
  currentFlat: Flat | null;
  members: FlatMember[];
  isLoading: boolean;
  error: string | null;
  fetchFlat: () => Promise<void>;
  createFlat: (name: string) => Promise<boolean>;
  joinFlat: (inviteCode: string) => Promise<boolean>;
  clearFlat: () => void;
}

export const useFlatStore = create<FlatState>((set) => ({
  currentFlat: null,
  members: [],
  isLoading: true,
  error: null,

  fetchFlat: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ currentFlat: null, isLoading: false });
      return;
    }

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('flat_members')
        .select(`
          flat_id,
          flats (
            id,
            name,
            invite_code
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      if (memberData && memberData.flats) {
        const { data: allMembers } = await supabase
          .from('flat_members')
          .select('user_id, role')
          .eq('flat_id', memberData.flat_id);
          
        set({ currentFlat: memberData.flats as unknown as Flat, members: allMembers || [], isLoading: false });
      } else {
        set({ currentFlat: null, members: [], isLoading: false });
      }
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  createFlat: async (name: string) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) return false;

    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: flatData, error: flatError } = await supabase
        .from('flats')
        .insert([{ name, invite_code: inviteCode }])
        .select()
        .single();

      if (flatError) throw flatError;

      const { error: memberError } = await supabase
        .from('flat_members')
        .insert([{ flat_id: flatData.id, user_id: user.id, role: 'admin' }]);

      if (memberError) throw memberError;

      set({ currentFlat: flatData as Flat, members: [{ user_id: user.id, role: 'admin' }], isLoading: false });
      return true;
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  joinFlat: async (inviteCode: string) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) return false;

    try {
      const { data: flatData, error: flatError } = await supabase
        .from('flats')
        .select()
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (flatError) throw new Error('Nie znaleziono mieszkania o podanym kodzie.');

      const { error: memberError } = await supabase
        .from('flat_members')
        .insert([{ flat_id: flatData.id, user_id: user.id, role: 'member' }]);

      if (memberError) {
        if (memberError.code === '23505') throw new Error('Jesteś już przypisany do tego mieszkania.');
        throw memberError;
      }
      
      await useFlatStore.getState().fetchFlat();
      return true;
      return true;
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  clearFlat: () => set({ currentFlat: null, members: [], error: null })
}));
