import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Optional devtools: uncomment if you install @tanstack/react-query-devtools
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/**
 * AuthProvider placeholder for future expansion
 *
 * Currently, auth state is managed at component level via useAuth hook.
 * If needed in the future, this can be extended to provide global auth state.
 *
 * Note: This doesn't introduce any new dependencies or context overhead.
 * Authentication remains lightweight with session persistence in localStorage.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
      {/* {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null} */}
    </QueryClientProvider>
  );
}
