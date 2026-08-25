import { QueryClient } from "@tanstack/react-query";

export const PRIVATE_QUERY_KEY = ["private"] as const;
export const CURRENT_USER_QUERY_KEY = [
  ...PRIVATE_QUERY_KEY,
  "current-user",
] as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
