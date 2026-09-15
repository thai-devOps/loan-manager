import { create } from "zustand";
import {
  applyTheme,
  getStoredTheme,
  persistTheme,
  type Theme,
} from "@/lib/theme";

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: Theme;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (value: boolean) => void;
  setTheme: (theme: Theme) => void;
  hydrateTheme: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  theme: getStoredTheme(),
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
  setTheme: (theme) => {
    persistTheme(theme);
    applyTheme(theme);
    set({ theme });
  },
  hydrateTheme: () => {
    const theme = getStoredTheme();
    applyTheme(theme);
    set({ theme });
  },
}));
