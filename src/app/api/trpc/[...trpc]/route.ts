import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/routers';
import { createContext } from '@/server/trpc/context';

export async function GET(req: Request) {
    const response = await fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext,
        onError({ error }) {
            if (error.code === 'UNAUTHORIZED') {
                console.error('UNAUTHORIZED', error);
            }
        },
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
        'Access-Control-Allow-Origin',
        'http://localhost:3000',
    );

    return response;
}

export { GET as POST };
