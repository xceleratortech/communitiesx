import { router, publicProcedure } from '../trpc';
import { communityRouter } from './community';
import { communitiesRouter } from './communities';
import { adminRouter } from './admin';
import { chatRouter } from './chat';
import { usersRouter } from './users';
import { organizationsRouter } from './organizations';
import { badgesRouter } from './badges';

export const appRouter = router({
    hello: publicProcedure.query(() => 'Hello world'),
    community: communityRouter,
    communities: communitiesRouter,
    admin: adminRouter,
    chat: chatRouter,
    users: usersRouter,
    organizations: organizationsRouter,
    badges: badgesRouter,
});

export type AppRouter = typeof appRouter;
