import { env } from '@/lib/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as authSchema from './auth-schema';
import * as schema from './schema';

// Skip database connection during build time
const isBuildTime =
    process.env.SKIP_ENV_VALIDATION === 'true' ||
    process.argv.includes('build') ||
    process.env.CI === 'true';

// Create a connection pool
const pool = new Pool({
    connectionString: env.DATABASE_URL as string,
    ...(isBuildTime && {
        // Provide mock configuration during build
        host: 'localhost',
        port: 5432,
        database: 'mock',
        user: 'mock',
        password: 'mock',
    }),
});
// Create the Drizzle ORM instance with merged schema
export const db = drizzle(pool, {
    schema: { ...schema, ...authSchema },
});

export const getUser = async (userId: string) => {
    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
    });
    return user;
};
// Export the pool for advanced use if needed
export { pool };
