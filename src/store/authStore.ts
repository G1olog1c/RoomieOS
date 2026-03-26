import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user ?? null, isLoading: false });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },
  updateProfile: async (displayName: string) => {
    try {
      set({ isLoading: true });
      const { data, error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName
        }
      });
      if (error) throw error;
      set({ user: data.user, isLoading: false });
      return true;
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
      return false;
    }
  }
}));
