import { z } from 'zod';

/**
 * Server-side environment variables schema
 * Add all required server env vars here.
 */
const serverSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    DATABASE_URL: z.string().url(),
    // Example:
    // NEXTAUTH_SECRET: z.string().min(1),
});

/**
 * Client-side environment variables schema
 * Add all required public env vars here (must start with NEXT_PUBLIC_)
 */
const clientSchema = z.object({
    // Example:
    // NEXT_PUBLIC_API_URL: z.string().url(),
});

function getServerEnv() {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error(
            '❌ Invalid server environment variables:',
            parsed.error.flatten().fieldErrors,
        );
        throw new Error('Invalid server environment variables');
    }
    return parsed.data;
}

function getClientEnv() {
    if (typeof window === 'undefined') {
        throw new Error('getClientEnv should only be called on the client');
    }
    const parsed = clientSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error(
            '❌ Invalid client environment variables:',
            parsed.error.flatten().fieldErrors,
        );
        throw new Error('Invalid client environment variables');
    }
    return parsed.data;
}

export const env = {
    ...getServerEnv(),
    ...(typeof window !== 'undefined' ? getClientEnv() : {}),
};

// Usage:
// import { env } from '@/lib/env';
// env.DATABASE_URL, env.NEXT_PUBLIC_API_URL, etc.
