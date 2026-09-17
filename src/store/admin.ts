"use client";

import { create } from "zustand";

interface AdminState {
  /** Null until the first answer arrives; members never flash admin links. */
  admin: boolean | null;
  /** Fetches once and caches — the common case, called on every page mount. */
  hydrate: () => Promise<void>;
  /**
   * Always re-fetches, bypassing the cache. Call this right after admin
   * sign-in or sign-out, since the layout that owns `hydrate()` mounts once
   * per session and its effect never fires again on a client-side navigation
   * — without this the sidebar and header would keep showing whatever role
   * was true when the app first loaded, no matter who signs in afterwards.
   */
  refresh: () => Promise<void>;
  clear: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  admin: null,

  hydrate: async () => {
    if (get().admin !== null) return;
    await get().refresh();
  },

  refresh: async () => {
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      const body = (await response.json()) as { admin?: boolean };
      set({ admin: body.admin === true });
    } catch {
      set({ admin: false });
    }
  },

  clear: () => set({ admin: null }),
}));
