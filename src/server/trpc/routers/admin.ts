import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc/trpc';
import { users, orgs, accounts, verifications } from '@/server/db/auth-schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { nanoid } from 'nanoid';
import { sendEmail } from '@/lib/email';
import { hash } from 'bcryptjs';

export const adminRouter = router({
    // Get all users
    getUsers: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user || ctx.session.user.role !== 'admin') {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Only admins can access user management',
            });
        }

        try {
            const allUsers = await db.query.users.findMany({
                with: {
                    // Include organization data if you have the relation defined
                },
            });

            return allUsers;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch users',
            });
        }
    }),

    // Get all organizations
    getOrgs: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user || ctx.session.user.role !== 'admin') {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Only admins can access organization management',
            });
        }

        try {
            const allOrgs = await db.query.orgs.findMany();
            return allOrgs;
        } catch (error) {
            console.error('Error fetching organizations:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch organizations',
            });
        }
    }),

    // Create a new organization
    createOrg: publicProcedure
        .input(
            z.object({
                name: z.string().min(1),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user || ctx.session.user.role !== 'admin') {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Only admins can create organizations',
                });
            }

            try {
                // Check if org with same name exists
                const existingOrg = await db.query.orgs.findFirst({
                    where: eq(orgs.name, input.name),
                });

                if (existingOrg) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message:
                            'An organization with this name already exists',
                    });
                }

                const orgId = nanoid();
                const [newOrg] = await db
                    .insert(orgs)
                    .values({
                        id: orgId,
                        name: input.name,
                    })
                    .returning();

                return newOrg;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error creating organization:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create organization',
                });
            }
        }),

    // Create a new user
    createUser: publicProcedure
        .input(
            z.object({
                name: z.string().min(1),
                email: z.string().email(),
                password: z.string().min(8),
                role: z.enum(['admin', 'user']),
                orgId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user || ctx.session.user.role !== 'admin') {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Only admins can create users',
                });
            }

            try {
                // Check if org exists
                const org = await db.query.orgs.findFirst({
                    where: eq(orgs.id, input.orgId),
                });

                if (!org) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Organization not found',
                    });
                }

                // Check if user with same email exists
                const existingUser = await db.query.users.findFirst({
                    where: eq(users.email, input.email),
                });

                if (existingUser) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'A user with this email already exists',
                    });
                }

                // Create user manually
                const userId = nanoid();
                const now = new Date();

                // Hash the password
                const hashedPassword = await hash(input.password, 10);

                // Create the user
                const [user] = await db
                    .insert(users)
                    .values({
                        id: userId,
                        name: input.name,
                        email: input.email,
                        emailVerified: true, // Admin-created users are pre-verified
                        orgId: input.orgId,
                        role: input.role,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning();

                // Create account with password
                await db.insert(accounts).values({
                    id: nanoid(),
                    userId: userId,
                    providerId: 'email',
                    accountId: input.email,
                    password: hashedPassword,
                    createdAt: now,
                    updatedAt: now,
                });

                return user;
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error creating user:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create user',
                });
            }
        }),

    // Send invite to a user
    inviteUser: publicProcedure
        .input(
            z.object({
                email: z.string().email(),
                orgId: z.string(),
                role: z.enum(['admin', 'user']),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user || ctx.session.user.role !== 'admin') {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Only admins can invite users',
                });
            }

            try {
                // Check if org exists
                const org = await db.query.orgs.findFirst({
                    where: eq(orgs.id, input.orgId),
                });

                if (!org) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Organization not found',
                    });
                }

                // Check if user already exists
                const existingUser = await db.query.users.findFirst({
                    where: eq(users.email, input.email),
                });

                if (existingUser) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'A user with this email already exists',
                    });
                }

                // Generate a unique invite token
                const inviteToken = nanoid(32);
                const now = new Date();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

                // Store invite in verifications table
                await db.insert(verifications).values({
                    id: nanoid(),
                    identifier: input.email,
                    value: JSON.stringify({
                        token: inviteToken,
                        orgId: input.orgId,
                        role: input.role,
                    }),
                    expiresAt,
                    createdAt: now,
                    updatedAt: now,
                });

                // Send the invite email
                const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/register?token=${inviteToken}&email=${input.email}`;

                await sendEmail({
                    to: input.email,
                    subject: `Invitation to join ${org.name}`,
                    html: `
                        <h1>You've been invited to join ${org.name}</h1>
                        <p>Click the link below to create your account:</p>
                        <a href="${inviteUrl}">Accept Invitation</a>
                        <p>This link will expire in 7 days.</p>
                    `,
                });

                return { success: true, email: input.email };
            } catch (error) {
                console.error('Error inviting user:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to send invitation',
                });
            }
        }),
});
