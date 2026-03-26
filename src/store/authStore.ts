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
  updateUserProfile: (firstName: string, lastName: string, username: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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
  updateUserProfile: async (firstName: string, lastName: string, username: string) => {
    const currentUser = get().user;
    if (!currentUser?.email) throw new Error('Brak danych użytkownika.');

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          username: username,
        },
      });

      if (error) throw error;

      if (data.user) {
        set({ user: data.user });
      }
    } catch (err: any) {
      throw new Error(err.message || 'Błąd podczas aktualizacji profilu.');
    }
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const currentUser = get().user;
    if (!currentUser?.email) throw new Error('Brak danych użytkownika.');

    try {
      // Verify current password by trying to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (verifyError) throw new Error('Podane hasło jest niepoprawne.');

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;
    } catch (err: any) {
      throw new Error(err.message || 'Błąd podczas zmiany hasła.');
    }
  },
}));
