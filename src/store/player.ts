"use client";

import { create } from "zustand";

export interface PlayerControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekBy: (delta: number) => void;
  seekTo: (seconds: number) => void;
  restart: () => void;
}

/**
 * Non-reactive registry of mounted players. Keyboard shortcuts and the
 * "play every model in turn" tour reach into this rather than through state,
 * so triggering playback never re-renders the grid.
 */
const registry = new Map<string, PlayerControls>();

export function registerPlayer(id: string, controls: PlayerControls): () => void {
  registry.set(id, controls);
  return () => {
    if (registry.get(id) === controls) registry.delete(id);
  };
}

export function controlsFor(id: string): PlayerControls | undefined {
  return registry.get(id);
}

export interface PlayerState {
  /** Clip id that is currently playing, if any. */
  activeId: string | null;
  activeLabel: string | null;
  rate: number;
  volume: number;
  loop: boolean;
  /** Pause every other clip when one starts. On by default: A/B listening. */
  solo: boolean;
  /** Keep the playhead when switching clips, so you can A/B the same moment. */
  keepPosition: boolean;
  setActive: (id: string, label: string) => void;
  clearActive: (id: string) => void;
  setRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setLoop: (loop: boolean) => void;
  setSolo: (solo: boolean) => void;
  setKeepPosition: (keepPosition: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  activeId: null,
  activeLabel: null,
  rate: 1,
  volume: 1,
  loop: false,
  solo: true,
  keepPosition: false,
  setActive: (activeId, activeLabel) => set({ activeId, activeLabel }),
  clearActive: (id) =>
    set((state) => (state.activeId === id ? { activeId: null, activeLabel: null } : state)),
  setRate: (rate) => set({ rate }),
  setVolume: (volume) => set({ volume }),
  setLoop: (loop) => set({ loop }),
  setSolo: (solo) => set({ solo }),
  setKeepPosition: (keepPosition) => set({ keepPosition }),
}));

/** Shared playhead used when `keepPosition` is on. */
let sharedPosition = 0;

export function setSharedPosition(seconds: number): void {
  sharedPosition = seconds;
}

export function getSharedPosition(): number {
  return sharedPosition;
}

export function playClip(id: string): void {
  controlsFor(id)?.play();
}

export function toggleClip(id: string): void {
  controlsFor(id)?.toggle();
}
