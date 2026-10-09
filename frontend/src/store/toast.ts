import { create } from "zustand";

export interface ToastItem {
  id: number;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  /** Queues a toast; it removes itself after `durationMs` (Signal-style auto-dismiss). */
  show: (message: string, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, durationMs = 4000) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message }] }));
    setTimeout(() => get().dismiss(id), durationMs);
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
