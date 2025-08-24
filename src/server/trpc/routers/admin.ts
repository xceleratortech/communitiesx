import { z } from 'zod';
import { router, adminProcedure, authProcedure } from '../trpc';
import { users, orgs, accounts, verifications } from '@/server/db/auth-schema';
import { initTRPC, TRPCError } from '@trpc/server';
import { eq, count, or, ilike, and, desc, asc } from 'drizzle-orm';
import { db } from '@/server/db';
import { nanoid } from 'nanoid';
import { sendEmail } from '@/lib/email';
import { hashPassword } from 'better-auth/crypto';
import { communityMembers } from '@/server/db/schema';
import { Context } from '../context';
import { createWelcomeEmail } from '@/lib/email-templates';

export const adminRouter = router({
    // Get paginated users with search and filtering
    getUsersPaginated: adminProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                limit: z.number().min(1).max(100).default(10),
                search: z.string().optional(),
                role: z
                    .enum(['all', 'super-admin', 'org-admin', 'user'])
                    .default('all'),
                orgId: z.string().optional(),
                verified: z
                    .enum(['all', 'verified', 'unverified'])
                    .default('all'),
                sortBy: z
                    .enum(['name', 'email', 'createdAt', 'role'])
                    .default('createdAt'),
                sortOrder: z.enum(['asc', 'desc']).default('desc'),
            }),
        )
        .query(async ({ input }) => {
            try {
                const {
                    page,
                    limit,
                    search,
                    role,
                    orgId,
                    verified,
                    sortBy,
                    sortOrder,
                } = input;
                const offset = (page - 1) * limit;

                // Build where conditions
                const whereConditions = [];

                // Search condition
                if (search && search.trim()) {
                    whereConditions.push(
                        or(
                            ilike(users.name, `%${search}%`),
                            ilike(users.email, `%${search}%`),
                        ),
                    );
                }

                // Role filtering
                if (role !== 'all') {
                    if (role === 'super-admin') {
                        whereConditions.push(eq(users.appRole, 'admin'));
                    } else if (role === 'org-admin') {
                        whereConditions.push(
                            and(
                                eq(users.role, 'admin'),
                                eq(users.appRole, 'user'),
                            ),
                        );
                    } else if (role === 'user') {
                        whereConditions.push(
                            and(
                                eq(users.role, 'user'),
                                eq(users.appRole, 'user'),
                            ),
                        );
                    }
                }

                // Organization filtering
                if (orgId && orgId !== 'all') {
                    whereConditions.push(eq(users.orgId, orgId));
                }

                // Verification filtering
                if (verified !== 'all') {
                    if (verified === 'verified') {
                        whereConditions.push(eq(users.emailVerified, true));
                    } else {
                        whereConditions.push(eq(users.emailVerified, false));
                    }
                }

                const whereClause =
                    whereConditions.length > 0
                        ? and(...whereConditions)
                        : undefined;

                // Build order by
                const sortableColumns = {
                    name: users.name,
                    email: users.email,
                    createdAt: users.createdAt,
                    role: users.role,
                };
                const column = sortableColumns[sortBy];
                const order = sortOrder === 'asc' ? asc : desc;
                const orderByClause = order(column);

                // Get total count for pagination
                const totalCountResult = await db
                    .select({ count: count() })
                    .from(users)
                    .where(whereClause);

                const totalCount = totalCountResult[0]?.count || 0;

                // Get paginated users
                const paginatedUsers = await db.query.users.findMany({
                    where: whereClause,
                    with: {
                        organization: true,
                    },
                    orderBy: [orderByClause],
                    limit: limit,
                    offset: offset,
                });

                return {
                    users: paginatedUsers,
                    pagination: {
                        page,
                        limit,
                        total: totalCount,
                        totalPages: Math.ceil(totalCount / limit),
                        hasNext: page < Math.ceil(totalCount / limit),
                        hasPrev: page > 1,
                    },
                };
            } catch (error) {
                console.error('Error fetching paginated users:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch users',
                });
            }
        }),

    // Get all users (keeping for backward compatibility)
    getUsers: adminProcedure.query(async ({ ctx }) => {
        try {
            const allUsers = await db.query.users.findMany({
                with: {
                    organization: true,
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
    getOrgs: adminProcedure.query(async ({ ctx }) => {
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
    createOrg: adminProcedure
        .input(
            z.object({
                name: z.string().min(1),
                slug: z
                    .string()
                    .min(1)
                    .max(50)
                    .regex(/^[a-z0-9-]+$/i, {
                        message:
                            'Slug must be alphanumeric and can include dashes',
                    }),
                allowCrossOrgDM: z.boolean().optional(), // Add allowCrossOrgDM
            }),
        )
        .mutation(async ({ input, ctx }) => {
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
                        slug: input.slug,
                        createdAt: new Date(),
                        allowCrossOrgDM: input.allowCrossOrgDM, // Add allowCrossOrgDM
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

    // Remove Organization
    removeOrg: adminProcedure
        .input(z.object({ orgId: z.string() }))
        .mutation(async ({ input, ctx }) => {
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

                // Remove all users in this org
                await db.delete(users).where(eq(users.orgId, input.orgId));

                // Remove the organization itself
                await db.delete(orgs).where(eq(orgs.id, input.orgId));

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error removing organization:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove organization',
                });
            }
        }),

    // Create a new user
    createUser: adminProcedure
        .input(
            z.object({
                name: z.string().min(1),
                email: z.string().email(),
                password: z.string().min(8),
                role: z.enum(['admin', 'user']),
                orgId: z.string().nullable(), // allow nullable for super-admin
                appRole: z.string().optional(), // allow passing appRole for super-admin
                allowCrossOrgDM: z.boolean().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            // Application-level check: Only appRole=admin can have orgId null
            if (
                (input.appRole !== 'admin' && !input.orgId) ||
                (!input.orgId && input.role !== 'admin')
            ) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Non-admin users must belong to an organization',
                });
            }
            try {
                // Only check org existence if orgId is provided
                if (input.orgId) {
                    const org = await db.query.orgs.findFirst({
                        where: eq(orgs.id, input.orgId),
                    });
                    if (!org) {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Organization not found',
                        });
                    }
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
                const hashedPassword = await hashPassword(input.password);
                // Create the user
                const userInsert: any = {
                    id: userId,
                    name: input.name,
                    email: input.email,
                    emailVerified: true, // Admin-created users are pre-verified
                    role: input.role,
                    appRole: input.appRole ?? 'user',
                    createdAt: now,
                    updatedAt: now,
                };
                if (typeof input.orgId === 'string') {
                    userInsert.orgId = input.orgId;
                }
                const [user] = await db
                    .insert(users)
                    .values(userInsert)
                    .returning();
                // Create account with password
                await db.insert(accounts).values({
                    id: nanoid(),
                    userId: userId,
                    providerId: 'credential',
                    accountId: userId,
                    password: hashedPassword,
                    createdAt: now,
                    updatedAt: now,
                });

                // Send welcome email
                try {
                    const welcomeEmail = createWelcomeEmail(
                        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login`,
                    );
                    await sendEmail({
                        to: user.email,
                        subject: welcomeEmail.subject,
                        html: welcomeEmail.html,
                    });
                    console.log(`Welcome email sent to ${user.email}`);
                } catch (emailError) {
                    console.error('Failed to send welcome email:', emailError);
                    // Don't fail the user creation if email fails
                }

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
    inviteUser: authProcedure
        .input(
            z.object({
                email: z.string().email(),
                orgId: z.string().nullable(), // allow nullable for super-admin
                role: z.enum(['admin', 'user']),
                appRole: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            // Application-level check: Only appRole=admin can have orgId null
            if (
                (input.appRole !== 'admin' && !input.orgId) ||
                (!input.orgId && input.role !== 'admin')
            ) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Non-admin users must belong to an organization',
                });
            }
            try {
                // Only check org existence if orgId is provided
                if (input.orgId) {
                    const org = await db.query.orgs.findFirst({
                        where: eq(orgs.id, input.orgId),
                    });
                    if (!org) {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Organization not found',
                        });
                    }
                }
                // Check if user already exists
                const existingUser = await db.query.users.findFirst({
                    where: eq(users.email, input.email),
                });
                if (existingUser) {
                    // If user is already part of any org, return error
                    if (existingUser.orgId) {
                        throw new TRPCError({
                            code: 'CONFLICT',
                            message:
                                'User is already part of another organization',
                        });
                    }
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'A user with this email already exists',
                    });
                }
                // Generate a unique invite token
                const inviteToken = nanoid(32);
                const now = new Date();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);
                // Store invite in verifications table
                await db.insert(verifications).values({
                    id: nanoid(),
                    identifier: input.email,
                    value: JSON.stringify({
                        token: inviteToken,
                        orgId: input.orgId ?? undefined,
                        role: input.role,
                        appRole: input.appRole ?? 'user',
                    }),
                    expiresAt,
                    createdAt: now,
                    updatedAt: now,
                });
                // Send the invite email
                const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/register?token=${inviteToken}&email=${input.email}`;
                await sendEmail({
                    to: input.email,
                    subject: `Invitation to join${input.orgId ? '' : ' as super-admin'}`,
                    html: `
                        <h1>You've been invited to join${input.orgId ? '' : ' as super-admin'}</h1>
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

    // Remove a user from the platform
    removeUser: adminProcedure
        .input(
            z.object({
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if user exists
                const user = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                });

                if (!user) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User not found',
                    });
                }

                // Don't allow admins to remove themselves
                if (user.id === ctx.session.user.id) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You cannot remove yourself',
                    });
                }

                // Remove user's community memberships
                await db
                    .delete(communityMembers)
                    .where(eq(communityMembers.userId, input.userId));

                // Remove user's accounts
                await db
                    .delete(accounts)
                    .where(eq(accounts.userId, input.userId));

                // Finally remove the user
                await db.delete(users).where(eq(users.id, input.userId));

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error removing user:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove user',
                });
            }
        }),

    // Get all organizations with member count
    getAllOrganizations: adminProcedure.query(async ({ ctx }) => {
        // Optimized: join users and orgs, group by org, count members in one query
        const orgsWithMemberCount = await db
            .select({
                id: orgs.id,
                name: orgs.name,
                slug: orgs.slug,
                createdAt: orgs.createdAt,
                memberCount: count(users.id).as('memberCount'),
            })
            .from(orgs)
            .leftJoin(users, eq(users.orgId, orgs.id))
            .groupBy(orgs.id);
        return orgsWithMemberCount;
    }),

    // Search organizations by name or slug
    searchOrganizations: adminProcedure
        .input(z.object({ searchTerm: z.string() }))
        .query(async ({ input, ctx }) => {
            // Fixed: Use proper Drizzle syntax for where clause
            const orgsWithMemberCount = await db
                .select({
                    id: orgs.id,
                    name: orgs.name,
                    slug: orgs.slug,
                    createdAt: orgs.createdAt,
                    memberCount: count(users.id).as('memberCount'),
                })
                .from(orgs)
                .leftJoin(users, eq(users.orgId, orgs.id))
                .where(
                    or(
                        ilike(orgs.name, `%${input.searchTerm}%`),
                        ilike(orgs.slug, `%${input.searchTerm}%`),
                    ),
                )
                .groupBy(orgs.id);

            return orgsWithMemberCount;
        }),

    makeAppAdmin: adminProcedure
        .input(
            z.object({
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if user exists
                const user = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                });

                if (!user) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User not found',
                    });
                }

                // Update user's appRole to admin
                await db
                    .update(users)
                    .set({ appRole: 'admin' })
                    .where(eq(users.id, input.userId));

                return { success: true };
            } catch (error) {
                console.error('Error making user an app admin:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to make user an app admin',
                });
            }
        }),

    // Get organization details for admin view
    getOrgDetails: adminProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input, ctx }) => {
            try {
                const org = await db.query.orgs.findFirst({
                    where: eq(orgs.slug, input.slug),
                    with: {
                        users: true,
                        communities: true,
                    },
                });

                if (!org) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Organization not found',
                    });
                }

                return org;
            } catch (error) {
                console.error('Error fetching organization details:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch organization details',
                });
            }
        }),
});
