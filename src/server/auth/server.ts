import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin, customSession } from 'better-auth/plugins';
import { sendEmail } from '@/lib/email';
import {
    createVerificationEmail,
    createResetPasswordEmail,
} from '@/lib/email-templates';
import { db, getUser } from '@/server/db';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'pg',
        usePlural: true,
    }),
    selectUserFields: ['id', 'name', 'email', ['org_id', 'orgId'], 'role'],
    plugins: [
        nextCookies(),
        admin({
            defaultRole: 'user',
            impersonationSessionDuration: 60 * 60 * 24,
        }),
        customSession(async ({ session, user }) => {
            // Custom session logic can be added here
            const userData = await getUser(user.id);
            return {
                appRole: userData?.appRole || 'user',
                user: {
                    ...user,
                    appRole: userData?.appRole || 'user',
                },
                session,
            };
        }),
    ],
    cors: {
        origin: [
            'http://localhost:3000',
            'https://communities-three.vercel.app',
            'https://communities-three.vercel.app/',
            'https://communities-git-pwa-fix-ranjan-bhats-projects.vercel.app/',
            'https://communities-git-pwa-fix-ranjan-bhats-projects.vercel.app',
            '*',
            'https://communities-git-dev-ranjan-bhats-projects.vercel.app',
            'https://communities-git-dev-ranjan-bhats-projects.vercel.app/',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    },
    emailVerification: undefined,
    emailAndPassword: {
        enabled: true,
        disableSignUp: false,
        requireEmailVerification: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
        sendResetPassword: async ({ user, url }) => {
            const { subject, html } = createResetPasswordEmail(url);
            await sendEmail({ to: user.email, subject, html });
        },
        resetPasswordTokenExpiresIn: 3600,
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (userData, ctx) => {
                    // Try to get orgId from various possible sources
                    let orgId = null;

                    // Check if there's a user object in the request body with org_id
                    if (ctx?.body?.user?.org_id) {
                        orgId = ctx.body.user.org_id;
                    }
                    // Check for direct orgId in request body
                    else if (ctx?.body?.orgId) {
                        orgId = ctx.body.orgId;
                    }

                    if (orgId) {
                        // Return modified user data with org_id explicitly set
                        return {
                            data: {
                                ...userData,
                                org_id: orgId,
                            },
                        };
                    }

                    return { data: userData };
                },
            },
        },
        session: {
            create: {
                after: async (session, ctx) => {
                    // Insert a login event on successful session creation
                    const { db } = await import('@/server/db');
                    const { loginEvents } = await import(
                        '@/server/db/auth-schema'
                    );
                    const { nanoid } = await import('nanoid');
                    await db.insert(loginEvents).values({
                        id: nanoid(),
                        userId: session.userId,
                        createdAt: new Date(),
                        ipAddress: session.ipAddress,
                        userAgent: session.userAgent,
                    });
                },
            },
        },
    },
});

export async function getUserSession(headers?: Headers) {
    return auth.api.getSession({
        headers: headers ?? new Headers(),
    });
}
