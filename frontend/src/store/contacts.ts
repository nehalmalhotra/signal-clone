import { create } from "zustand";
import { contactsApi } from "@/lib/endpoints";
import { fullName } from "@/lib/names";
import type { UserPublic } from "@/lib/types";

interface ContactsState {
  contacts: UserPublic[];
  load: () => Promise<void>;
  add: (userId: number) => Promise<UserPublic>;
}

function byName(a: UserPublic, b: UserPublic): number {
  return fullName(a).localeCompare(fullName(b));
}

export const useContacts = create<ContactsState>((set) => ({
  contacts: [],

  load: async () => {
    const list = await contactsApi.list();
    set({ contacts: [...list].sort(byName) });
  },

  add: async (userId) => {
    // The backend returns the same user whether or not they were already a contact.
    const contact = await contactsApi.add(userId);
    set((state) => ({
      contacts: [contact, ...state.contacts.filter((c) => c.id !== contact.id)].sort(byName),
    }));
    return contact;
  },
}));
