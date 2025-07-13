import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from './schema';
import * as authSchema from './auth-schema';

// Create a connection pool
const pool = new Pool({
    connectionString: env.DATABASE_URL,
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
