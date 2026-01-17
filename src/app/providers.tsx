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

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null} */}
    </QueryClientProvider>
  );
}
