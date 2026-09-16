"use client";

import { create } from "zustand";

export interface Listener {
  id: string;
  name: string;
}

interface ListenerState {
  listener: Listener | null;
  /** False until the first /api/session call has come back. */
  ready: boolean;
  pending: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: (name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

let hydrating: Promise<void> | null = null;

export const useListenerStore = create<ListenerState>((set) => ({
  listener: null,
  ready: false,
  pending: false,
  error: null,

  hydrate: async () => {
    // The layout mounts this on every page; only the first call does the work.
    hydrating ??= (async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const body = (await response.json()) as { listener: Listener | null };
        set({ listener: body.listener, ready: true });
      } catch {
        set({ ready: true });
      }
    })();
    return hydrating;
  },

  signIn: async (name) => {
    set({ pending: true, error: null });
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json()) as { listener?: Listener; error?: string };
      if (!response.ok || !body.listener) {
        set({ pending: false, error: body.error ?? "Could not sign in." });
        return false;
      }
      set({ listener: body.listener, pending: false, ready: true });
      return true;
    } catch {
      set({ pending: false, error: "Network error — is the server running?" });
      return false;
    }
  },

  signOut: async () => {
    await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
    set({ listener: null });
  },
}));
