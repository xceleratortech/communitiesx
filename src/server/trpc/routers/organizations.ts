import {
    eq,
    count,
    and,
    like,
    ilike,
    or,
    desc,
    asc,
    ne,
    inArray,
} from 'drizzle-orm';
import { z } from 'zod';
import { router, publicProcedure, authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    orgs,
    posts,
    comments,
    communities,
    communityAllowedOrgs,
    communityMembers,
    communityMemberRequests,
    communityInvites,
    directMessages,
    chatThreads,
    notifications,
    reactions,
    attachments,
    userBadgeAssignments,
    userBadges,
    userProfiles,
    pushSubscriptions,
    loginEvents,
    sessions,
    orgMembers,
    notificationPreferences,
    postTags,
} from '@/server/db/schema';
import { users, accounts } from '@/server/db/auth-schema';
import type { Org, OrgMember } from '@/types/models';
import { SQL } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { createWelcomeEmail } from '@/lib/email-templates';

export const organizationsRouter = router({
    // Get organization details by ID
    getOrgDetails: publicProcedure
        .input(
            z.object({
                orgId: z.string(),
                allowCrossOrgDM: z.boolean().optional(), // Add allowCrossOrgDM
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message:
                        'You must be logged in to view organization details',
                });
            }

            try {
                // Get organization details
                const organization = await db.query.orgs.findFirst({
                    where: eq(orgs.id, input.orgId),
                });

                if (!organization) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Organization not found',
                    });
                }

                // Count members in this organization
                const [membersResult] = await db
                    .select({ count: count() })
                    .from(users)
                    .where(eq(users.orgId, input.orgId));

                // Count posts from this organization
                const [postsResult] = await db
                    .select({ count: count() })
                    .from(posts)
                    .where(eq(posts.orgId, input.orgId));

                // Count comments from users in this organization
                const [commentsResult] = await db
                    .select({ count: count() })
                    .from(comments)
                    .innerJoin(users, eq(comments.authorId, users.id))
                    .where(eq(users.orgId, input.orgId));

                // Get admin users for this organization
                const adminUsers = await db.query.users.findMany({
                    where: and(
                        eq(users.orgId, input.orgId),
                        eq(users.role, 'admin'),
                    ),
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                    orderBy: [users.name],
                });

                return {
                    id: organization.id,
                    name: organization.name,
                    slug: organization.slug,
                    createdAt: organization.createdAt,
                    membersCount: membersResult?.count || 0,
                    postsCount: postsResult?.count || 0,
                    commentsCount: commentsResult?.count || 0,
                    admins: adminUsers,
                };
            } catch (error) {
                console.error('Error fetching organization details:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch organization details',
                });
            }
        }),

    getOrganizationByUserId: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view organizations',
                });
            }

            try {
                // Get the user and their orgId
                const user = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                    columns: { orgId: true },
                });

                if (!user?.orgId) {
                    return [];
                }

                // Get the organization
                const organization = await db.query.orgs.findFirst({
                    where: eq(orgs.id, user.orgId),
                });

                if (!organization) {
                    return [];
                }

                // Count members in this organization
                const [membersResult] = await db
                    .select({ count: count() })
                    .from(users)
                    .where(eq(users.orgId, user.orgId));

                return [
                    {
                        id: organization.id,
                        name: organization.name,
                        slug: organization.slug,
                        createdAt: organization.createdAt,
                        memberCount: membersResult?.count || 0,
                    },
                ];
            } catch (error) {
                console.error('Error fetching user organizations:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch organizations',
                });
            }
        }),

    searchOrganizations: publicProcedure
        .input(
            z.object({
                userId: z.string(),
                searchTerm: z.string().min(1),
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to search organizations',
                });
            }

            try {
                // Early return if search term is empty after trimming
                if (!input.searchTerm.trim()) {
                    return [];
                }

                // Get the user and their orgId
                const user = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                    columns: { orgId: true },
                });

                if (!user?.orgId) {
                    return [];
                }

                // Get the organization and check if it matches the search term
                const organization = await db.query.orgs.findFirst({
                    where: and(
                        eq(orgs.id, user.orgId),
                        or(
                            ilike(orgs.name, `%${input.searchTerm.trim()}%`),
                            ilike(orgs.slug, `%${input.searchTerm.trim()}%`),
                        ),
                    ),
                });

                if (!organization) {
                    return [];
                }

                // Count members in this organization
                const [membersResult] = await db
                    .select({ count: count() })
                    .from(users)
                    .where(eq(users.orgId, user.orgId));

                return [
                    {
                        id: organization.id,
                        name: organization.name,
                        slug: organization.slug,
                        createdAt: organization.createdAt,
                        memberCount: membersResult?.count || 0,
                    },
                ];
            } catch (error) {
                console.error('Error searching user organizations:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to search organizations',
                });
            }
        }),

    getOrganizationWithCommunities: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input, ctx }) => {
            const org = await db.query.orgs.findFirst({
                where: eq(orgs.slug, input.slug),
            });
            if (!org)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Organization not found',
                });

            // Get communities that directly belong to this organization
            const directCommunities = await db.query.communities.findMany({
                where: eq(communities.orgId, org.id),
            });

            // Get communities that are allowed for this organization via communityAllowedOrgs
            const allowedCommunities = await db.query.communities.findMany({
                where: (communities, { inArray }) =>
                    inArray(
                        communities.id,
                        db
                            .select({
                                communityId: communityAllowedOrgs.communityId,
                            })
                            .from(communityAllowedOrgs)
                            .where(eq(communityAllowedOrgs.orgId, org.id)),
                    ),
            });

            // Combine and deduplicate communities
            const allCommunities = [
                ...directCommunities,
                ...allowedCommunities.filter(
                    (allowed) =>
                        !directCommunities.some(
                            (direct) => direct.id === allowed.id,
                        ),
                ),
            ];

            const members = await db.query.users.findMany({
                where: eq(users.orgId, org.id),
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
                orderBy: [users.createdAt],
            });

            return { ...org, communities: allCommunities, members };
        }),

    deleteCommunity: publicProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            // Optionally: check permissions here
            await db
                .delete(communities)
                .where(eq(communities.id, input.communityId));
            return { success: true };
        }),

    getOrganizationsForCommunityCreate: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view organizations',
                });
            }

            // Check if current user is super admin
            const currentUser = await db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
                columns: { appRole: true },
            });

            const isSuperAdmin = currentUser?.appRole === 'admin';

            if (isSuperAdmin) {
                // Super admins can create communities for any organization
                const allOrgs = await db.query.orgs.findMany();
                return allOrgs.map((org) => ({ id: org.id, name: org.name }));
            } else {
                // Regular users can only create communities for orgs where they are admin
                const adminOrgs = await db.query.orgs.findMany({
                    where: (orgs, { eq }) =>
                        eq(
                            orgs.id,
                            db
                                .select({ orgId: users.orgId })
                                .from(users)
                                .where(eq(users.id, input.userId)),
                        ),
                });
                return adminOrgs.map((org) => ({ id: org.id, name: org.name }));
            }
        }),

    makeOrgAdmin: publicProcedure
        .input(z.object({ orgId: z.string(), userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to perform this action',
                });
            }

            // Check if the user is already an admin
            const user = await db.query.users.findFirst({
                where: and(
                    eq(users.id, input.userId),
                    eq(users.orgId, input.orgId),
                ),
            });

            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found in this organization',
                });
            }

            // Update user role to admin
            await db
                .update(users)
                .set({ role: 'admin' })
                .where(eq(users.id, input.userId));
            return { success: true, message: 'User has been made an admin' };
        }),

    // Get paginated organization members with search and filtering
    getOrganizationMembersPaginated: publicProcedure
        .input(
            z.object({
                orgId: z.string(),
                page: z.number().min(1).default(1),
                limit: z.number().min(1).max(100).default(10),
                search: z.string().optional(),
                role: z.enum(['all', 'admin', 'user']).default('all'),
                sortBy: z
                    .enum(['name', 'email', 'createdAt', 'role'])
                    .default('createdAt'),
                sortOrder: z.enum(['asc', 'desc']).default('desc'),
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message:
                        'You must be logged in to view organization members',
                });
            }

            try {
                // Build where conditions
                const whereConditions: SQL<unknown>[] = [
                    eq(users.orgId, input.orgId),
                ];

                // Add search condition
                if (input.search && input.search.trim()) {
                    const searchCondition = or(
                        ilike(users.name, `%${input.search.trim()}%`),
                        ilike(users.email, `%${input.search.trim()}%`),
                    );
                    if (searchCondition) {
                        whereConditions.push(searchCondition);
                    }
                }

                // Add role filter
                if (input.role !== 'all') {
                    whereConditions.push(eq(users.role, input.role));
                }

                // Count total members matching criteria
                const [totalResult] = await db
                    .select({ count: count() })
                    .from(users)
                    .where(and(...whereConditions));

                const total = totalResult?.count || 0;
                const totalPages = Math.ceil(total / input.limit);
                const offset = (input.page - 1) * input.limit;

                // Get paginated members
                const members = await db.query.users.findMany({
                    where: and(...whereConditions),
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        createdAt: true,
                    },
                    orderBy: (() => {
                        const sortableColumns = {
                            name: users.name,
                            email: users.email,
                            createdAt: users.createdAt,
                            role: users.role,
                        };
                        const column = sortableColumns[input.sortBy];
                        const order = input.sortOrder === 'asc' ? asc : desc;
                        return [order(column)];
                    })(),
                    limit: input.limit,
                    offset: offset,
                });

                return {
                    members,
                    pagination: {
                        page: input.page,
                        limit: input.limit,
                        total,
                        totalPages,
                        hasNextPage: input.page < totalPages,
                        hasPrevPage: input.page > 1,
                    },
                };
            } catch (error) {
                console.error('Error fetching organization members:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch organization members',
                });
            }
        }),

    removeOrgMember: publicProcedure
        .input(z.object({ orgId: z.string(), userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            // This function removes a user from an organization by deleting their content
            // and transferring ownership of communities to organization admins.

            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to perform this action',
                });
            }

            // Check if user has permission to remove members
            const currentUser = await db.query.users.findFirst({
                where: eq(users.id, ctx.session.user.id),
                columns: { orgId: true, appRole: true },
            });

            // Super admins can remove members from any organization
            const isSuperAdmin = currentUser?.appRole === 'admin';

            if (
                !isSuperAdmin &&
                (!currentUser || currentUser.orgId !== input.orgId)
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'You can only remove members from your own organization',
                });
            }

            // Check if the user exists in the organization
            const user = await db.query.users.findFirst({
                where: and(
                    eq(users.id, input.userId),
                    eq(users.orgId, input.orgId),
                ),
            });

            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found in this organization',
                });
            }

            // Prevent removing yourself
            if (input.userId === ctx.session.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You cannot remove yourself from the organization',
                });
            }

            // Delete all related data first, then delete the user
            // This handles foreign key constraints by deleting in the correct order

            try {
                // Find an organization admin to transfer ownership of user's content
                const orgAdmin = await db.query.users.findFirst({
                    where: and(
                        eq(users.orgId, input.orgId),
                        eq(users.role, 'admin'),
                        ne(users.id, input.userId),
                    ),
                    columns: { id: true },
                });

                // Use a transaction for critical operations
                const result = await db.transaction(async (tx) => {
                    try {
                        // Delete user's content to resolve foreign key constraints
                        // IMPORTANT: Delete in correct order to avoid foreign key violations

                        // 1. First delete post tags for posts by this user
                        await tx
                            .delete(postTags)
                            .where(
                                inArray(
                                    postTags.postId,
                                    tx
                                        .select({ id: posts.id })
                                        .from(posts)
                                        .where(
                                            eq(posts.authorId, input.userId),
                                        ),
                                ),
                            );

                        // 2. Delete comments by this user
                        await tx
                            .delete(comments)
                            .where(eq(comments.authorId, input.userId));

                        // 3. Delete ALL comments that reference posts by this user
                        // This is critical - comments by other users on posts by this user must be deleted first
                        await tx
                            .delete(comments)
                            .where(
                                inArray(
                                    comments.postId,
                                    tx
                                        .select({ id: posts.id })
                                        .from(posts)
                                        .where(
                                            eq(posts.authorId, input.userId),
                                        ),
                                ),
                            );

                        // 4. Now safe to delete posts
                        await tx
                            .delete(posts)
                            .where(eq(posts.authorId, input.userId));

                        // 3. Delete other user-related data
                        await tx
                            .delete(reactions)
                            .where(eq(reactions.userId, input.userId));
                        await tx
                            .delete(notifications)
                            .where(eq(notifications.recipientId, input.userId));

                        // Delete notification preferences
                        await tx
                            .delete(notificationPreferences)
                            .where(
                                eq(
                                    notificationPreferences.userId,
                                    input.userId,
                                ),
                            );

                        await tx
                            .delete(communityMembers)
                            .where(eq(communityMembers.userId, input.userId));
                        await tx
                            .delete(communityMemberRequests)
                            .where(
                                eq(
                                    communityMemberRequests.userId,
                                    input.userId,
                                ),
                            );
                        await tx
                            .delete(communityMemberRequests)
                            .where(
                                eq(
                                    communityMemberRequests.reviewedBy,
                                    input.userId,
                                ),
                            );
                        await tx
                            .delete(communityInvites)
                            .where(
                                or(
                                    eq(
                                        communityInvites.createdBy,
                                        input.userId,
                                    ),
                                    eq(communityInvites.usedBy, input.userId),
                                ),
                            );
                        await tx
                            .delete(communityAllowedOrgs)
                            .where(
                                eq(communityAllowedOrgs.addedBy, input.userId),
                            );
                        await tx
                            .delete(userBadges)
                            .where(eq(userBadges.createdBy, input.userId));
                        await tx
                            .delete(userBadgeAssignments)
                            .where(
                                eq(userBadgeAssignments.userId, input.userId),
                            );
                        await tx
                            .delete(userProfiles)
                            .where(eq(userProfiles.userId, input.userId));
                        await tx
                            .delete(attachments)
                            .where(eq(attachments.uploadedBy, input.userId));
                        await tx
                            .delete(directMessages)
                            .where(
                                or(
                                    eq(directMessages.senderId, input.userId),
                                    eq(
                                        directMessages.recipientId,
                                        input.userId,
                                    ),
                                ),
                            );
                        await tx
                            .delete(chatThreads)
                            .where(
                                or(
                                    eq(chatThreads.user1Id, input.userId),
                                    eq(chatThreads.user2Id, input.userId),
                                ),
                            );
                        await tx
                            .delete(orgMembers)
                            .where(eq(orgMembers.userId, input.userId));
                        await tx
                            .delete(pushSubscriptions)
                            .where(eq(pushSubscriptions.userId, input.userId));
                        await tx
                            .delete(loginEvents)
                            .where(eq(loginEvents.userId, input.userId));

                        // Transfer community ownership if user created any
                        if (orgAdmin) {
                            await tx
                                .update(communities)
                                .set({ createdBy: orgAdmin.id })
                                .where(eq(communities.createdBy, input.userId));
                        }

                        // Delete the user
                        await tx
                            .delete(users)
                            .where(eq(users.id, input.userId));

                        return {
                            success: true,
                            message:
                                'User has been permanently removed from the organization',
                        };
                    } catch (txError) {
                        throw txError;
                    }
                });

                return result;
            } catch (error) {
                console.error('Detailed error in removeOrgMember:', error);
                console.error(
                    'Error stack:',
                    error instanceof Error ? error.stack : 'No stack trace',
                );

                // If it's a database constraint error, provide more specific information
                if (
                    error instanceof Error &&
                    error.message.includes('foreign key constraint')
                ) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'Cannot remove user due to remaining data dependencies. Please contact support.',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete user data. Please try again.',
                });
            }
        }),

    // Create a new user within the organization (for org admins)
    createUser: authProcedure
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
            try {
                // Get the current user's details
                const currentUser = await db.query.users.findFirst({
                    where: eq(users.id, ctx.session.user.id),
                    columns: { orgId: true, role: true, appRole: true },
                });

                if (!currentUser) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'User not found',
                    });
                }

                // Check if user is super admin or org admin of the target organization
                const isSuperAdmin = currentUser.appRole === 'admin';
                const isOrgAdmin =
                    currentUser.role === 'admin' &&
                    currentUser.orgId === input.orgId;

                if (!isSuperAdmin && !isOrgAdmin) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to create users in this organization',
                    });
                }

                // Verify the organization exists
                const org = await db.query.orgs.findFirst({
                    where: eq(orgs.id, input.orgId),
                });

                if (!org) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Organization not found',
                    });
                }

                // Check if user with same email already exists
                const existingUser = await db.query.users.findFirst({
                    where: eq(users.email, input.email),
                });

                if (existingUser) {
                    // Check if the existing user belongs to a different organization
                    if (
                        existingUser.orgId &&
                        existingUser.orgId !== input.orgId
                    ) {
                        throw new TRPCError({
                            code: 'CONFLICT',
                            message:
                                'User already belongs to another organization',
                        });
                    } else if (existingUser.orgId === input.orgId) {
                        throw new TRPCError({
                            code: 'CONFLICT',
                            message: 'User already exists in this organization',
                        });
                    }
                }

                // Import nanoid for generating user ID
                const { nanoid } = await import('nanoid');
                const { hashPassword } = await import('better-auth/crypto');

                // Create user manually
                const userId = nanoid();
                const now = new Date();

                // Hash the password
                const hashedPassword = await hashPassword(input.password);

                // Create the user
                const userInsert = {
                    id: userId,
                    name: input.name,
                    email: input.email,
                    emailVerified: true, // Admin-created users are pre-verified
                    role: input.role,
                    appRole: 'user', // Org admins can only create regular users
                    orgId: input.orgId,
                    createdAt: now,
                    updatedAt: now,
                };

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
});
