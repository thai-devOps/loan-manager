import { onlineManager, QueryClient } from "@tanstack/react-query";

// Local-first: IndexedDB reads/writes must not pause when the browser goes
// offline. TanStack Query defaults to networkMode "online", which freezes
// mutations after the offline event until reload (onlineManager stays true
// on cold start without an offline event).
onlineManager.setOnline(
  typeof navigator !== "undefined" ? navigator.onLine : true,
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: "always",
    },
    mutations: {
      networkMode: "always",
    },
  },
});
