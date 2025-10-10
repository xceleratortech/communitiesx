import { z } from 'zod';
import { authProcedure } from '../trpc';
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
    communities,
    communityMembers,
    communityMemberRequests,
    users,
} from '@/server/db/schema';
import { and, eq, desc, inArray, sql } from 'drizzle-orm';
import { ServerPermissions } from '@/server/utils/permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';

export const membershipProcedures = {
    joinCommunity: authProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if the community exists
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                });

                if (!community) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Community not found',
                    });
                }

                // Check if the user is already a member
                const existingMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    });

                if (existingMembership) {
                    if (existingMembership.membershipType === 'member') {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message:
                                'You are already a member of this community',
                        });
                    }

                    // Not a member: ensure a join request exists (no follower upgrade)
                    const existingRequest =
                        await db.query.communityMemberRequests.findFirst({
                            where: and(
                                eq(
                                    communityMemberRequests.userId,
                                    ctx.session.user.id,
                                ),
                                eq(
                                    communityMemberRequests.communityId,
                                    input.communityId,
                                ),
                                eq(communityMemberRequests.requestType, 'join'),
                                eq(communityMemberRequests.status, 'pending'),
                            ),
                        });

                    if (existingRequest) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message:
                                'You already have a pending request to join this community',
                        });
                    }

                    const [newRequest] = await db
                        .insert(communityMemberRequests)
                        .values({
                            userId: ctx.session.user.id,
                            communityId: input.communityId,
                            requestType: 'join',
                            status: 'pending',
                            requestedAt: new Date(),
                        })
                        .returning();

                    return {
                        status: 'pending',
                        request: newRequest,
                    };
                }

                // For public communities, create a new membership directly
                if (community.type === 'public') {
                    const [newMembership] = await db
                        .insert(communityMembers)
                        .values({
                            userId: ctx.session.user.id,
                            communityId: input.communityId,
                            role: 'member',
                            membershipType: 'member',
                            status: 'active',
                            joinedAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning();

                    return {
                        status: 'approved',
                        membership: newMembership,
                    };
                } else {
                    // For private communities, check if there's already a pending request
                    const existingRequest =
                        await db.query.communityMemberRequests.findFirst({
                            where: and(
                                eq(
                                    communityMemberRequests.userId,
                                    ctx.session.user.id,
                                ),
                                eq(
                                    communityMemberRequests.communityId,
                                    input.communityId,
                                ),
                                eq(communityMemberRequests.requestType, 'join'),
                                eq(communityMemberRequests.status, 'pending'),
                            ),
                        });

                    if (existingRequest) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message:
                                'You already have a pending request to join this community',
                        });
                    }

                    // Create a new join request
                    const [newRequest] = await db
                        .insert(communityMemberRequests)
                        .values({
                            userId: ctx.session.user.id,
                            communityId: input.communityId,
                            requestType: 'join',
                            status: 'pending',
                            requestedAt: new Date(),
                        })
                        .returning();

                    return {
                        status: 'pending',
                        request: newRequest,
                    };
                }
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error joining community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to join community',
                });
            }
        }),

    leaveCommunity: authProcedure
        .input(z.object({ communityId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if the user is a member of the community
                const membership = await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.userId, ctx.session.user.id),
                        eq(communityMembers.communityId, input.communityId),
                        eq(communityMembers.membershipType, 'member'),
                    ),
                });

                if (!membership) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'You are not a member of this community',
                    });
                }

                // Check if the user is the admin (creator) of the community
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                });

                if (community && community.createdBy === ctx.session.user.id) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'Community creators cannot leave their own community',
                    });
                }

                // Delete the membership
                await db
                    .delete(communityMembers)
                    .where(
                        and(
                            eq(communityMembers.userId, ctx.session.user.id),
                            eq(communityMembers.communityId, input.communityId),
                        ),
                    );

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error leaving community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to leave community',
                });
            }
        }),

    // Get pending membership requests for a community (admin/moderator only)
    getPendingRequests: authProcedure
        .input(z.object({ communityId: z.number() }))
        .query(async ({ input, ctx }) => {
            try {
                // Check if user is an admin or moderator of the community
                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to view pending requests',
                    });
                }
                // Get all pending requests for the community
                const pendingRequests =
                    await db.query.communityMemberRequests.findMany({
                        where: and(
                            eq(
                                communityMemberRequests.communityId,
                                input.communityId,
                            ),
                            eq(communityMemberRequests.status, 'pending'),
                        ),
                        with: {
                            user: {
                                columns: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    image: true,
                                },
                            },
                        },
                        orderBy: desc(communityMemberRequests.requestedAt),
                    });

                return pendingRequests;
            } catch (error) {
                console.error('Error fetching pending requests:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch pending requests',
                });
            }
        }),

    // Approve a membership request (admin/moderator only)
    approveRequest: authProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the request details
                const request =
                    await db.query.communityMemberRequests.findFirst({
                        where: eq(communityMemberRequests.id, input.requestId),
                    });

                if (!request) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Request not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        request.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to approve requests',
                    });
                }

                // Check if the request is still pending
                if (request.status !== 'pending') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This request has already been processed',
                    });
                }

                // Update the request status
                await db
                    .update(communityMemberRequests)
                    .set({
                        status: 'approved',
                        reviewedAt: new Date(),
                        reviewedBy: ctx.session.user.id,
                    })
                    .where(eq(communityMemberRequests.id, input.requestId));

                // Check if the user already has a relationship with this community
                const existingMembership =
                    await db.query.communityMembers.findFirst({
                        where: and(
                            eq(communityMembers.userId, request.userId),
                            eq(
                                communityMembers.communityId,
                                request.communityId,
                            ),
                        ),
                    });

                if (!existingMembership) {
                    // Create a new membership
                    await db.insert(communityMembers).values({
                        userId: request.userId,
                        communityId: request.communityId,
                        role: 'member',
                        membershipType: 'member',
                        status: 'active',
                        joinedAt: new Date(),
                        updatedAt: new Date(),
                    });
                }

                return { success: true, requestId: input.requestId };
            } catch (error) {
                console.error('Error approving request:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to approve request',
                });
            }
        }),

    // Reject a membership request (admin/moderator only)
    rejectRequest: authProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the request details
                const request =
                    await db.query.communityMemberRequests.findFirst({
                        where: eq(communityMemberRequests.id, input.requestId),
                    });

                if (!request) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Request not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        request.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You dont have access to reject requests',
                    });
                }

                // Check if the request is still pending
                if (request.status !== 'pending') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This request has already been processed',
                    });
                }

                // Update the request status
                await db
                    .update(communityMemberRequests)
                    .set({
                        status: 'rejected',
                        reviewedAt: new Date(),
                        reviewedBy: ctx.session.user.id,
                    })
                    .where(eq(communityMemberRequests.id, input.requestId));

                return { success: true, requestId: input.requestId };
            } catch (error) {
                console.error('Error rejecting request:', error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to reject request',
                });
            }
        }),

    // Get user's pending requests for a community
    getUserPendingRequests: authProcedure
        .input(z.object({ communityId: z.number() }))
        .query(async ({ input, ctx }) => {
            try {
                // Get all pending requests for the user in this community
                const pendingRequests =
                    await db.query.communityMemberRequests.findMany({
                        where: and(
                            eq(
                                communityMemberRequests.communityId,
                                input.communityId,
                            ),
                            eq(
                                communityMemberRequests.userId,
                                ctx.session.user.id,
                            ),
                            eq(communityMemberRequests.status, 'pending'),
                        ),
                    });

                return pendingRequests;
            } catch (error) {
                console.error('Error fetching user pending requests:', error);
                return [];
            }
        }),

    // Cancel user's own pending request
    cancelPendingRequest: authProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Get the request details
                const request =
                    await db.query.communityMemberRequests.findFirst({
                        where: eq(communityMemberRequests.id, input.requestId),
                    });

                if (!request) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Request not found',
                    });
                }

                // Check if the request belongs to the current user
                if (request.userId !== ctx.session.user.id) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You can only cancel your own requests',
                    });
                }

                // Check if the request is still pending
                if (request.status !== 'pending') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'This request has already been processed',
                    });
                }

                // Delete the request
                await db
                    .delete(communityMemberRequests)
                    .where(eq(communityMemberRequests.id, input.requestId));

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error('Error canceling pending request:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to cancel request',
                });
            }
        }),

    getUserCommunities: authProcedure.query(async ({ ctx }) => {
        try {
            // Get all communities where the user is a member or follower
            const userMemberships = await db.query.communityMembers.findMany({
                where: and(
                    eq(communityMembers.userId, ctx.session.user.id),
                    eq(communityMembers.status, 'active'),
                ),
                with: {
                    community: {
                        with: {
                            members: {
                                with: {
                                    user: {
                                        columns: {
                                            id: true,
                                            name: true,
                                            email: true,
                                            image: true,
                                        },
                                    },
                                },
                                limit: 3, // Only get first 3 members for avatar display
                            },
                        },
                    },
                },
            });

            // Get member counts for each community
            const communityIds = userMemberships.map(
                (membership) => membership.community.id,
            );
            const memberCounts = await db
                .select({
                    communityId: communityMembers.communityId,
                    count: sql<number>`count(*)`.as('count'),
                })
                .from(communityMembers)
                .where(
                    communityIds.length > 0
                        ? and(
                              inArray(
                                  communityMembers.communityId,
                                  communityIds,
                              ),
                              eq(communityMembers.status, 'active'),
                          )
                        : sql`false`,
                )
                .groupBy(communityMembers.communityId);

            // Create a map of community ID to member count
            const memberCountMap = new Map(
                memberCounts.map((mc) => [mc.communityId, mc.count]),
            );

            // Return communities with role information, member data, and member count
            const userCommunities = userMemberships.map((membership) => ({
                ...membership.community,
                userRole: membership.role,
                memberCount: memberCountMap.get(membership.community.id) || 0,
            }));

            return userCommunities;
        } catch (error) {
            console.error('Error fetching user communities:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch user communities',
            });
        }
    }),

    // Get communities where user can post (member, org admin, or super admin)
    getUserPostableCommunities: authProcedure.query(async ({ ctx }) => {
        try {
            const userId = ctx.session.user.id;
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found',
                });
            }

            // Get communities where user is a member with posting permissions
            const userMemberships = await db.query.communityMembers.findMany({
                where: and(
                    eq(communityMembers.userId, userId),
                    eq(communityMembers.status, 'active'),
                    eq(communityMembers.membershipType, 'member'), // Only members can post
                ),
                with: {
                    community: true,
                },
            });

            // Get communities from user's organization (if user is org admin)
            let orgCommunities: (typeof communities.$inferSelect)[] = [];
            if (user.orgId && user.role === 'admin') {
                orgCommunities = await db.query.communities.findMany({
                    where: eq(communities.orgId, user.orgId),
                });
            }

            // Get all communities (if user is super admin)
            let allCommunities: (typeof communities.$inferSelect)[] = [];
            if (user.role === 'admin' && !user.orgId) {
                // This is a super admin
                allCommunities = await db.query.communities.findMany();
            }

            // Get organization data for all communities
            const orgIds = new Set<string>();
            userMemberships.forEach(
                (m) => m.community.orgId && orgIds.add(m.community.orgId),
            );
            orgCommunities.forEach((c) => c.orgId && orgIds.add(c.orgId));
            allCommunities.forEach((c) => c.orgId && orgIds.add(c.orgId));

            const orgs =
                orgIds.size > 0
                    ? await db.query.orgs.findMany({
                          where: (orgs, { inArray }) =>
                              inArray(orgs.id, Array.from(orgIds)),
                      })
                    : [];

            const orgMap = new Map(orgs.map((org) => [org.id, org]));

            // Combine and deduplicate communities
            const memberCommunities = userMemberships.map((membership) => ({
                ...membership.community,
                userRole: membership.role,
                canPost: true,
                reason: 'member' as const,
                organization: membership.community.orgId
                    ? orgMap.get(membership.community.orgId)
                    : null,
            }));

            const orgAdminCommunities = orgCommunities
                .filter(
                    (community) =>
                        !memberCommunities.some(
                            (member) => member.id === community.id,
                        ),
                )
                .map((community) => ({
                    ...community,
                    userRole: 'admin',
                    canPost: true,
                    reason: 'org_admin' as const,
                    organization: community.orgId
                        ? orgMap.get(community.orgId)
                        : null,
                }));

            const superAdminCommunities = allCommunities
                .filter(
                    (community) =>
                        !memberCommunities.some(
                            (member) => member.id === community.id,
                        ) &&
                        !orgAdminCommunities.some(
                            (orgCommunity) => orgCommunity.id === community.id,
                        ),
                )
                .map((community) => ({
                    ...community,
                    userRole: 'admin',
                    canPost: true,
                    reason: 'super_admin' as const,
                    organization: community.orgId
                        ? orgMap.get(community.orgId)
                        : null,
                }));

            return [
                ...memberCommunities,
                ...orgAdminCommunities,
                ...superAdminCommunities,
            ];
        } catch (error) {
            console.error('Error fetching postable communities:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch postable communities',
            });
        }
    }),

    // Remove a user from a community (with role-based security checks)
    removeUserFromCommunity: authProcedure
        .input(
            z.object({
                communityId: z.number(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if community exists
                const community = await db.query.communities.findFirst({
                    where: eq(communities.id, input.communityId),
                    with: {
                        members: true,
                    },
                });

                if (!community) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Community not found',
                    });
                }

                const permission = await ServerPermissions.fromUserId(
                    ctx.session.user.id,
                );
                const canManageMembers =
                    await permission.checkCommunityPermission(
                        input.communityId.toString(),
                        PERMISSIONS.MANAGE_COMMUNITY_MEMBERS,
                    );

                if (!canManageMembers) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You dont have access to remove user from community',
                    });
                }

                // Check if the target user is a member of the community
                const targetUserMembership = community.members.find(
                    (m) => m.userId === input.userId,
                );

                if (!targetUserMembership) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User is not a member of this community',
                    });
                }

                // Check if user is trying to remove the community creator
                const isRemovingCreator = community.createdBy === input.userId;

                if (isRemovingCreator) {
                    // Check if user has permission to remove community creator
                    const canRemoveCreator =
                        await permission.checkCommunityPermission(
                            input.communityId.toString(),
                            PERMISSIONS.REMOVE_COMMUNITY_CREATOR,
                        );

                    if (!canRemoveCreator) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'Cannot remove the community creator. Only super admins, organization admins, or community admins can perform this action.',
                        });
                    }
                }

                // Check if user is trying to remove an admin (role-based protection)
                if (targetUserMembership.role === 'admin') {
                    // Only super admins, org admins, and community admins can remove other admins
                    const canRemoveAdmin =
                        await permission.checkCommunityPermission(
                            input.communityId.toString(),
                            PERMISSIONS.REMOVE_COMMUNITY_ADMIN,
                        );

                    if (!canRemoveAdmin) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'Cannot remove admin users. Only super admins, organization admins, or community admins can perform this action.',
                        });
                    }
                }

                // Check if user is trying to remove a moderator (role-based protection)
                if (targetUserMembership.role === 'moderator') {
                    // Get current user's membership to check their role
                    const currentUserMembership = community.members.find(
                        (m) => m.userId === ctx.session.user.id,
                    );

                    // Only admins can remove moderators
                    if (currentUserMembership?.role !== 'admin') {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'Cannot remove moderator users. Only community admins can perform this action.',
                        });
                    }
                }

                // Remove the user from the community
                await db
                    .delete(communityMembers)
                    .where(
                        and(
                            eq(communityMembers.communityId, input.communityId),
                            eq(communityMembers.userId, input.userId),
                        ),
                    );

                // Also delete any pending requests from this user
                await db
                    .delete(communityMemberRequests)
                    .where(
                        and(
                            eq(
                                communityMemberRequests.communityId,
                                input.communityId,
                            ),
                            eq(communityMemberRequests.userId, input.userId),
                        ),
                    );

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('Error removing user from community:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to remove user from community',
                });
            }
        }),
};
