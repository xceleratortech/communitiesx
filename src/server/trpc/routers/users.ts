import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { eq, and, inArray, desc } from 'drizzle-orm';
import {
    users,
    orgs,
    communityMembers,
    communities,
    userBadgeAssignments,
} from '@/server/db/schema';
import { getUserPermission } from '../services/user-service';

export const usersRouter = router({
    // Get a user's profile information
    getUserProfile: publicProcedure
        .input(
            z.object({
                userId: z.string(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                // First, get the user
                const user = await db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        orgId: true,
                        role: true,
                        appRole: true,
                    },
                });

                if (!user) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User not found',
                    });
                }

                // Then, get the organization name separately
                const organization = await db.query.orgs.findFirst({
                    where: user.orgId ? eq(orgs.id, user.orgId) : undefined,
                    columns: {
                        name: true,
                    },
                });

                // Get user badges separately
                const userBadges = await db.query.userBadgeAssignments.findMany(
                    {
                        where: eq(userBadgeAssignments.userId, input.userId),
                        with: {
                            badge: true,
                            assignedBy: {
                                columns: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                        orderBy: [desc(userBadgeAssignments.assignedAt)],
                    },
                );

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    orgId: user.orgId,
                    orgName: organization?.name,
                    appRole: user.appRole,
                    orgRole: user.role,
                    badges: userBadges || [],
                };
            } catch (error) {
                console.error('Error fetching user profile:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch user profile',
                });
            }
        }),

    // Get communities that both the current user and the specified user are members of
    getMutualCommunities: publicProcedure
        .input(
            z.object({
                userId: z.string(),
            }),
        )
        .query(async ({ input, ctx }) => {
            if (!ctx.session?.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in to view mutual communities',
                });
            }

            try {
                const currentUserId = ctx.session.user.id;

                // Get communities where the target user is a member
                const targetUserCommunities =
                    await db.query.communityMembers.findMany({
                        where: eq(communityMembers.userId, input.userId),
                        columns: {
                            communityId: true,
                        },
                    });

                if (targetUserCommunities.length === 0) {
                    return [];
                }

                const targetCommunityIds = targetUserCommunities.map(
                    (c) => c.communityId,
                );

                // Get communities where both users are members
                const currentUserMemberships =
                    await db.query.communityMembers.findMany({
                        where: and(
                            eq(communityMembers.userId, currentUserId),
                            inArray(
                                communityMembers.communityId,
                                targetCommunityIds,
                            ),
                        ),
                        columns: {
                            communityId: true,
                        },
                    });

                if (currentUserMemberships.length === 0) {
                    return [];
                }

                const mutualCommunityIds = currentUserMemberships.map(
                    (c) => c.communityId,
                );

                // Get the community details
                const mutualCommunities = await db.query.communities.findMany({
                    where: inArray(communities.id, mutualCommunityIds),
                    columns: {
                        id: true,
                        name: true,
                        slug: true,
                        avatar: true,
                    },
                });

                return mutualCommunities;
            } catch (error) {
                console.error('Error fetching mutual communities:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch mutual communities',
                });
            }
        }),

    // Get the current user's permissions
    getPermissions: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.session?.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You must be logged in to view permissions',
            });
        }

        return await getUserPermission(ctx.session.user.id);
    }),
});
