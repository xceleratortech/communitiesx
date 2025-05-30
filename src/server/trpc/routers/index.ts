import { router, publicProcedure } from '../trpc';
import { communityRouter } from './community';
import { communitiesRouter } from './communities';
import { adminRouter } from './admin';

export const appRouter = router({
    hello: publicProcedure.query(() => 'Hello world'),
    community: communityRouter,
    communities: communitiesRouter,
    admin: adminRouter,
});

export type AppRouter = typeof appRouter;
