import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { getUserSession } from '@/server/auth/server';

export async function createContext(opts: FetchCreateContextFnOptions) {
    try {
        const session = await getUserSession(opts.req.headers);

        if (!session) {
            return {
                headers: opts.req.headers,
                session: null,
            };
        }

        return {
            headers: opts.req.headers,
            session,
        };
    } catch (error) {
        console.error('Error getting session:', error);
        return {
            headers: opts.req.headers,
            session: null,
        };
    }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
