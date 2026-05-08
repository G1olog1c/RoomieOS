import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useFlatStore } from './flatStore';

const PAGE_SIZE = 80;

export interface ChatMessage {
  id: string;
  flat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatState {
  messages: ChatMessage[];
  hasMore: boolean;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  fetchMessages: (opts?: { before?: string }) => Promise<void>;
  sendMessage: (text: string) => Promise<boolean>;
  subscribeToRoom: (flatId: string) => () => void;
  clearMessages: () => void;
}

let activeChannel: RealtimeChannel | null = null;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  hasMore: false,
  isLoading: false,
  isSending: false,
  error: null,

  fetchMessages: async (opts) => {
    const flat = useFlatStore.getState().currentFlat;
    if (!flat) return;

    const before = opts?.before;
    set({ isLoading: true, error: null });

    try {
      let q = supabase
        .from('chat_messages')
        .select('*')
        .eq('flat_id', flat.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (before) {
        q = q.lt('created_at', before);
      }

      const { data, error } = await q;
      if (error) throw error;

      const batch = ((data || []) as ChatMessage[]).reverse();
      set((state) => {
        if (before) {
          const merged = [...batch, ...state.messages];
          const seen = new Set<string>();
          const deduped = merged.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
          return {
            messages: deduped,
            hasMore: batch.length >= PAGE_SIZE,
            isLoading: false,
          };
        }
        return {
          messages: batch,
          hasMore: batch.length >= PAGE_SIZE,
          isLoading: false,
        };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nie udało się wczytać wiadomości';
      set({ error: message, isLoading: false });
    }
  },

  sendMessage: async (text) => {
    const flat = useFlatStore.getState().currentFlat;
    const user = useAuthStore.getState().user;
    const trimmed = text.trim();
    if (!flat || !user || !trimmed || trimmed.length > 4000) return false;

    set({ isSending: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            flat_id: flat.id,
            sender_id: user.id,
            content: trimmed,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;
      const row = data as ChatMessage;
      set((state) => {
        if (state.messages.some((m) => m.id === row.id)) {
          return { isSending: false };
        }
        return { messages: [...state.messages, row], isSending: false };
      });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nie udało się wysłać';
      set({ error: message, isSending: false });
      return false;
    }
  },

  subscribeToRoom: (flatId: string) => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    const channel = supabase
      .channel(`flat-chat:${flatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `flat_id=eq.${flatId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (!row?.id) return;
          set((state) => {
            if (state.messages.some((m) => m.id === row.id)) return state;
            return { messages: [...state.messages, row] };
          });
        }
      )
      .subscribe();

    activeChannel = channel;

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }
    };
  },

  clearMessages: () => set({ messages: [], hasMore: false, error: null }),
}));
