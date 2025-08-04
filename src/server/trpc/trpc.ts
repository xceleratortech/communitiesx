import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAdmin = t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
    if (ctx.session.user.appRole !== 'admin') {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Forbidden - Insufficient permissions',
        });
    }
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
        },
    });
});

const isAuthenticated = t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
        },
    });
});

export const authProcedure = publicProcedure.use(isAuthenticated);
export const adminProcedure = publicProcedure.use(isAdmin);
