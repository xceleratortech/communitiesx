import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { createNextApiHandler } from '@trpc/server/adapters/next';

// Initialize tRPC with a JSON transformer
const t = initTRPC.context<{}>().create({
    transformer: superjson,
});
const router = t.router;
const publicProcedure = t.procedure;

// Root router with hello world route
const appRouter = router({
    hello: publicProcedure.query(() => 'Hello world'),
});

// Export type definition of the API
export type AppRouter = typeof appRouter;

// Next.js App Router handlers
export const GET = createNextApiHandler({
    router: appRouter,
    createContext: () => ({}),
});
export const POST = GET;
