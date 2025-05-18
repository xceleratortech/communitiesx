import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { communityRouter } from './routers/community';
import { createContext } from './context';
import type { Context } from './context';

// Initialize tRPC
const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// App router with example hello procedure
export const appRouter = router({
    hello: publicProcedure.query(() => 'Hello world'),
    community: communityRouter,
});

// Export type router type
export type AppRouter = typeof appRouter;

// Export context
export { createContext };
