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
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

interface FlatState {
  currentFlat: Flat | null;
  userFlats: Flat[];
  members: FlatMember[];
  isLoading: boolean;
  error: string | null;
  fetchFlat: () => Promise<void>;
  setCurrentFlat: (flatId: string) => Promise<void>;
  createFlat: (name: string) => Promise<boolean>;
  joinFlat: (inviteCode: string) => Promise<boolean>;
  leaveFlat: () => Promise<boolean>;
  removeMember: (userId: string) => Promise<boolean>;
  clearFlat: () => void;
}

export const useFlatStore = create<FlatState>((set, get) => ({
  currentFlat: null,
  userFlats: [],
  members: [],
  isLoading: true,
  error: null,

  fetchFlat: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ currentFlat: null, userFlats: [], isLoading: false });
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
        .eq('user_id', user.id);

      if (memberError) {
        throw memberError;
      }

      const flats = (memberData || []).map(m => m.flats as unknown as Flat).filter(Boolean);
      
      if (flats.length > 0) {
        const state = get();
        // Keep current flat if it exists in the list, otherwise pick the first one
        let selectedFlat = state.currentFlat && flats.find(f => f.id === state.currentFlat!.id) 
            ? state.currentFlat 
            : flats[0];

        const { data: allMembers, error: rpcError } = await supabase
          .rpc('get_flat_members_profiles', { p_flat_id: selectedFlat.id });
          
        if (rpcError) {
            console.error('Błąd pobierania profili (RPC):', rpcError);
            const { data: fallbackMembers } = await supabase
              .from('flat_members')
              .select('user_id, role')
              .eq('flat_id', selectedFlat.id);
            set({ currentFlat: selectedFlat, userFlats: flats, members: fallbackMembers || [], isLoading: false });
        } else {
            set({ currentFlat: selectedFlat, userFlats: flats, members: allMembers || [], isLoading: false });
        }
      } else {
        set({ currentFlat: null, userFlats: [], members: [], isLoading: false });
      }
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  setCurrentFlat: async (flatId: string) => {
    set({ isLoading: true, error: null });
    const { userFlats } = get();
    const targetFlat = userFlats.find((f: Flat) => f.id === flatId);
    
    if (!targetFlat) {
       set({ isLoading: false, error: 'Nie znaleziono mieszkania' });
       return;
    }

    try {
        const { data: allMembers, error: rpcError } = await supabase
          .rpc('get_flat_members_profiles', { p_flat_id: flatId });
          
        if (rpcError) {
            console.error('Błąd pobierania profili (RPC):', rpcError);
            const { data: fallbackMembers } = await supabase
              .from('flat_members')
              .select('user_id, role')
              .eq('flat_id', flatId);
            set({ currentFlat: targetFlat, members: fallbackMembers || [], isLoading: false });
        } else {
            set({ currentFlat: targetFlat, members: allMembers || [], isLoading: false });
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

      await useFlatStore.getState().fetchFlat();
      await useFlatStore.getState().setCurrentFlat(flatData.id);
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
      await useFlatStore.getState().setCurrentFlat(flatData.id);
      return true;
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  leaveFlat: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    const currentFlat = useFlatStore.getState().currentFlat;
    if (!user || !currentFlat) {
        set({ isLoading: false });
        return false;
    }

    try {
      const { error } = await supabase
        .from('flat_members')
        .delete()
        .eq('flat_id', currentFlat.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Force refreshing the flat to either select next available flat or clear it if 0
      const store = useFlatStore.getState();
      // Null out currentFlat initially so fetchFlat picks a new one
      set({ currentFlat: null, isLoading: true });
      await store.fetchFlat();
      return true;
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  removeMember: async (userIdToRemove: string) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    const currentFlat = useFlatStore.getState().currentFlat;
    if (!user || !currentFlat) {
        set({ isLoading: false });
        return false;
    }

    try {
      const { error } = await supabase
        .from('flat_members')
        .delete()
        .eq('flat_id', currentFlat.id)
        .eq('user_id', userIdToRemove);

      if (error) throw error;

      await useFlatStore.getState().fetchFlat();
      return true;
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  clearFlat: () => set({ currentFlat: null, userFlats: [], members: [], error: null })
}));
