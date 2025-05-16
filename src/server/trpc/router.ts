import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

// Create tRPC context (add shared context values here)
export function createContext() {
    return {};
}
export type Context = ReturnType<typeof createContext>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// App router with example hello procedure
export const appRouter = router({
    hello: publicProcedure.query(() => 'Hello world'),
});

// Export API type
export type AppRouter = typeof appRouter;
