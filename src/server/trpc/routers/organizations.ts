import { eq, count, and, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    users,
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
    pushSubscriptions,
    loginEvents,
    sessions,
    accounts,
} from '@/server/db/schema';
import type { Org, OrgMember } from '@/types/models';

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
                            like(orgs.name, `%${input.searchTerm}%`),
                            like(orgs.slug, `%${input.searchTerm}%`),
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

            const orgCommunities = await db.query.communities.findMany({
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

            return { ...org, communities: orgCommunities, members };
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

    removeOrgMember: publicProcedure
        .input(z.object({ orgId: z.string(), userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
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

            // Delete user badge assignments
            await db
                .delete(userBadgeAssignments)
                .where(eq(userBadgeAssignments.userId, input.userId));

            // Delete push subscriptions
            await db
                .delete(pushSubscriptions)
                .where(eq(pushSubscriptions.userId, input.userId));

            // Delete login events
            await db
                .delete(loginEvents)
                .where(eq(loginEvents.userId, input.userId));

            // Delete sessions
            await db.delete(sessions).where(eq(sessions.userId, input.userId));

            // Delete accounts
            await db.delete(accounts).where(eq(accounts.userId, input.userId));

            // Delete reactions
            await db
                .delete(reactions)
                .where(eq(reactions.userId, input.userId));

            // Delete notifications
            await db
                .delete(notifications)
                .where(eq(notifications.recipientId, input.userId));

            // Delete direct messages
            await db
                .delete(directMessages)
                .where(
                    or(
                        eq(directMessages.senderId, input.userId),
                        eq(directMessages.recipientId, input.userId),
                    ),
                );

            // Delete chat threads
            await db
                .delete(chatThreads)
                .where(
                    or(
                        eq(chatThreads.user1Id, input.userId),
                        eq(chatThreads.user2Id, input.userId),
                    ),
                );

            // Delete community member requests
            await db
                .delete(communityMemberRequests)
                .where(eq(communityMemberRequests.userId, input.userId));

            // Delete community members
            await db
                .delete(communityMembers)
                .where(eq(communityMembers.userId, input.userId));

            // Delete comments
            await db
                .delete(comments)
                .where(eq(comments.authorId, input.userId));

            // Delete posts
            await db.delete(posts).where(eq(posts.authorId, input.userId));

            // Delete attachments
            await db
                .delete(attachments)
                .where(eq(attachments.uploadedBy, input.userId));

            // Delete community invites (where user is the creator or user)
            await db
                .delete(communityInvites)
                .where(
                    or(
                        eq(communityInvites.createdBy, input.userId),
                        eq(communityInvites.usedBy, input.userId),
                    ),
                );

            // Delete community allowed orgs (where user is the adder)
            await db
                .delete(communityAllowedOrgs)
                .where(eq(communityAllowedOrgs.addedBy, input.userId));

            // Delete user badges (where user is the creator)
            await db
                .delete(userBadges)
                .where(eq(userBadges.createdBy, input.userId));

            // Finally delete the user
            const result = await db
                .delete(users)
                .where(eq(users.id, input.userId))
                .returning();

            console.log('Remove member result:', result);

            return {
                success: true,
                message:
                    'User has been permanently removed from the organization',
            };
        }),
});
