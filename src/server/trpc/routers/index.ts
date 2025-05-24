import { router } from '@/server/trpc/trpc';
import { communityRouter } from './community';
import { adminRouter } from './admin';

export const appRouter = router({
    community: communityRouter,
    admin: adminRouter,
});

export type AppRouter = typeof appRouter;
