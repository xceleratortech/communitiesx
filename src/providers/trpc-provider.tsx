'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import superjson from 'superjson';
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/trpc/routers';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Provider to wrap your app with both tRPC and React Query
export function TRPCProvider({ children }: React.PropsWithChildren<{}>) {
    const [queryClient] = React.useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30 * 1000, // 30 seconds
                        refetchOnWindowFocus: false, // Don't refetch on window focus
                        retry: 1, // Reduce retries
                    },
                },
            }),
    );
    const [trpcClient] = React.useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                    transformer: superjson,
                    headers: () => ({
                        'x-trpc-source': 'client',
                        'Content-Type': 'application/json',
                    }),
                    fetch: (url, options) => {
                        return fetch(url, {
                            ...options,
                            credentials: 'include',
                        } as RequestInit);
                    },
                }),
            ],
        }),
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </trpc.Provider>
    );
}
