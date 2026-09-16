"use client";

import { create } from "zustand";

interface AdminState {
  /** Null until the first answer arrives; members never flash admin links. */
  admin: boolean | null;
  hydrate: () => Promise<void>;
  clear: () => void;
}

let hydrating: Promise<void> | null = null;

export const useAdminStore = create<AdminState>((set) => ({
  admin: null,
  hydrate: async () => {
    hydrating ??= (async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const body = (await response.json()) as { admin?: boolean };
        set({ admin: body.admin === true });
      } catch {
        set({ admin: false });
      }
    })();
    return hydrating;
  },
  clear: () => {
    hydrating = null;
    set({ admin: null });
  },
}));
